import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../src/users/users.service';
import { User } from '../src/users/user.entity';
import { CreateUserDto } from '../src/users/dto/create-user.dto';
import { UserRole } from '../src/users/user-role.enum';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';

describe('UsersService', () => {
  let service: UsersService;
  let repository: Repository<User>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(UsersService);
    repository = module.get(getRepositoryToken(User));
  });

  it('should call setPassword and save hashed user', async () => {
    const user = new User();
    user.id = 'uuid-user-1';
    user.username = 'admin';
    user.displayName = 'Admin User';
    user.role = UserRole.ADMIN;
    user.active = true;

    jest.spyOn(repository, 'findOne').mockResolvedValue(null);
    jest.spyOn(repository, 'create').mockReturnValue(user);
    jest.spyOn(user, 'setPassword').mockResolvedValue(undefined);
    jest.spyOn(repository, 'save').mockResolvedValue(user);

    const dto: CreateUserDto = {
      username: 'admin',
      password: 'secret123',
      displayName: 'Admin User',
      role: UserRole.ADMIN,
    };

    const result = await service.create(dto);

    expect(user.setPassword).toHaveBeenCalledWith('secret123');
    expect(result.username).toBe('admin');
  });

  it('should verify correct password', async () => {
    const hash = await bcrypt.hash('secret123', 10);
    const result = await service.verifyPassword('secret123', hash);
    expect(result).toBe(true);
  });

  it('should reject incorrect password', async () => {
    const hash = await bcrypt.hash('secret123', 10);
    const result = await service.verifyPassword('wrong-password', hash);
    expect(result).toBe(false);
  });

  it('updates displayName', async () => {
    const user = {
      id: 'u1',
      username: 'admin',
      displayName: 'Old Name',
      role: UserRole.ADMIN,
      active: true,
    } as User;

    jest.spyOn(repository, 'findOne').mockResolvedValue(user);
    jest.spyOn(repository, 'save').mockImplementation(async (u) => u as User);

    const result = await service.update('u1', 'u2', {
      displayName: 'New Name',
    });

    expect(result.displayName).toBe('New Name');
  });

  it('rejects self-deactivation', async () => {
    const user = { id: 'u1', role: UserRole.ADMIN, active: true } as User;
    jest.spyOn(repository, 'findOne').mockResolvedValue(user);

    await expect(service.update('u1', 'u1', { active: false })).rejects.toThrow(
      'You cannot deactivate your own account',
    );
  });

  it('rejects self role change', async () => {
    const user = { id: 'u1', role: UserRole.ADMIN, active: true } as User;
    jest.spyOn(repository, 'findOne').mockResolvedValue(user);

    await expect(service.update('u1', 'u1', { role: UserRole.STAFF })).rejects.toThrow(
      'You cannot change your own role',
    );
  });

  it('throws NotFoundException when target user does not exist', async () => {
    jest.spyOn(repository, 'findOne').mockResolvedValue(null);

    await expect(service.update('missing', 'u2', { displayName: 'X' })).rejects.toThrow(
      NotFoundException,
    );
  });
});
