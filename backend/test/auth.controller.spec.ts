import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard';
import { RolesGuard } from '../src/auth/roles.guard';
import { UserRole } from '../src/users/user-role.enum';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            login: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(AuthController);
    authService = module.get(AuthService);
  });

  it('should call auth service login', async () => {
    const mockLoginResponse = {
      accessToken: 'jwt-token-123',
      user: {
        id: 'uuid-user-1',
        username: 'admin',
        displayName: 'Admin User',
        role: UserRole.ADMIN,
      },
    };

    jest.spyOn(authService, 'login').mockResolvedValue(mockLoginResponse);

    const result = await controller.login({
      username: 'admin',
      password: 'secret123',
    });

    expect(result.accessToken).toBe('jwt-token-123');
  });

  it('should return admin confirmation for admin role', async () => {
    const result = await controller.adminCheck();
    expect(result.message).toBe('Admin access confirmed');
  });
});
