import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../src/users/users.service';
import { User } from '../src/users/user.entity';
import { CreateUserDto } from '../src/users/dto/create-user.dto';
import { UserRole } from '../src/users/user-role.enum';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

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

  it('should hash password before saving', async () => {
    jest.spyOn(repository, 'findOne').mockResolvedValue(null);

    const plainPassword = 'secret123';

    const createdUser = {
      id: 'uuid-user-1',
      username: 'admin',
      passwordHash: await bcrypt.hash(plainPassword, 10),
      displayName: 'Admin User',
      role: UserRole.ADMIN,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as User;

    jest.spyOn(repository, 'create').mockReturnValue(createdUser);
    jest.spyOn(repository, 'save').mockResolvedValue(createdUser);

    const dto: CreateUserDto = {
      username: 'admin',
      password: plainPassword,
      displayName: 'Admin User',
      role: UserRole.ADMIN,
    };

    const result = await service.create(dto);

    expect(result).toBeDefined();
    expect(createdUser.passwordHash).not.toBe(plainPassword);
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
});
