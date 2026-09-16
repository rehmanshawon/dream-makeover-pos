import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { BadRequestException } from '@nestjs/common';

import { ChangePasswordDto } from './dto/change-password.dto';
@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto): Promise<LoginResponseDto> {
    const user = await this.usersService.findByUsername(dto.username);

    if (!user) {
      throw new UnauthorizedException('Invalid username or password');
    }

    if (!user.active) {
      throw new UnauthorizedException('User account is inactive');
    }

    const isPasswordValid = await this.usersService.verifyPassword(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid username or password');
    }

    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
      },
    };
  }

  /**
   * Changes the password of the currently authenticated user.
   *
   * Requires the current password to prevent session hijacking.
   * Does not invalidate existing sessions — JWT expiry handles that.
   *
   * @throws UnauthorizedException if the current password is wrong
   * @throws BadRequestException if the new password equals the current one
   */
  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.usersService.findByIdRaw(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const matches = await this.usersService.verifyPassword(dto.currentPassword, user.passwordHash);
    if (!matches) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const sameAsCurrent = await this.usersService.verifyPassword(
      dto.newPassword,
      user.passwordHash,
    );
    if (sameAsCurrent) {
      throw new BadRequestException('New password must be different from the current password');
    }

    await this.usersService.setPassword(userId, dto.newPassword);
  }
}
