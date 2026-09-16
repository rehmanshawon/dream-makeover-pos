import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../src/auth/auth.service';
import { UsersService } from '../src/users/users.service';
import { User } from '../src/users/user.entity';
import { UserRole } from '../src/users/user-role.enum';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByUsername: jest.fn(),
            verifyPassword: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
  });

  it('should return JWT token for valid credentials', async () => {
    const user = {
      id: 'uuid-user-1',
      username: 'admin',
      passwordHash: 'hashed-password',
      displayName: 'Admin User',
      role: UserRole.ADMIN,
      active: true,
    } as User;

    jest.spyOn(usersService, 'findByUsername').mockResolvedValue(user);
    jest.spyOn(usersService, 'verifyPassword').mockResolvedValue(true);
    jest.spyOn(jwtService, 'signAsync').mockResolvedValue('jwt-token-123');

    const result = await service.login({
      username: 'admin',
      password: 'secret123',
    });

    expect(result.accessToken).toBe('jwt-token-123');
    expect(result.user.username).toBe('admin');
    expect(result.user.role).toBe(UserRole.ADMIN);
  });

  it('should reject unknown username', async () => {
    jest.spyOn(usersService, 'findByUsername').mockResolvedValue(null);

    await expect(service.login({ username: 'ghost', password: 'secret123' })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should reject incorrect password', async () => {
    const user = {
      id: 'uuid-user-1',
      username: 'admin',
      passwordHash: 'hashed-password',
      displayName: 'Admin User',
      role: UserRole.ADMIN,
      active: true,
    } as User;

    jest.spyOn(usersService, 'findByUsername').mockResolvedValue(user);
    jest.spyOn(usersService, 'verifyPassword').mockResolvedValue(false);

    await expect(service.login({ username: 'admin', password: 'wrong' })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should reject inactive user', async () => {
    const user = {
      id: 'uuid-user-1',
      username: 'admin',
      passwordHash: 'hashed-password',
      displayName: 'Admin User',
      role: UserRole.ADMIN,
      active: false,
    } as User;

    jest.spyOn(usersService, 'findByUsername').mockResolvedValue(user);
    jest.spyOn(usersService, 'verifyPassword').mockResolvedValue(true);

    await expect(service.login({ username: 'admin', password: 'secret123' })).rejects.toThrow(
      UnauthorizedException,
    );
  });
});

describe('changePassword', () => {
  let usersService: UsersService;
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByIdRaw: jest.fn(),
            verifyPassword: jest.fn(),
            setPassword: jest.fn(),
          },
        },
        { provide: JwtService, useValue: { signAsync: jest.fn() } },
      ],
    }).compile();

    service = module.get(AuthService);
    usersService = module.get(UsersService);
  });

  it('changes password when current is correct and new differs', async () => {
    (usersService.findByIdRaw as jest.Mock).mockResolvedValue({
      id: 'u1',
      passwordHash: 'old-hash',
    });
    (usersService.verifyPassword as jest.Mock)
      .mockResolvedValueOnce(true) // current matches
      .mockResolvedValueOnce(false); // new != current

    await service.changePassword('u1', {
      currentPassword: 'old-pass',
      newPassword: 'new-pass-12345',
    });

    expect(usersService.setPassword).toHaveBeenCalledWith('u1', 'new-pass-12345');
  });

  it('rejects when current password is wrong', async () => {
    (usersService.findByIdRaw as jest.Mock).mockResolvedValue({
      id: 'u1',
      passwordHash: 'old-hash',
    });
    (usersService.verifyPassword as jest.Mock).mockResolvedValueOnce(false);

    await expect(
      service.changePassword('u1', {
        currentPassword: 'wrong',
        newPassword: 'new-pass-12345',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects when new password matches current', async () => {
    (usersService.findByIdRaw as jest.Mock).mockResolvedValue({
      id: 'u1',
      passwordHash: 'old-hash',
    });
    (usersService.verifyPassword as jest.Mock)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true);

    await expect(
      service.changePassword('u1', {
        currentPassword: 'old-pass',
        newPassword: 'old-pass',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
