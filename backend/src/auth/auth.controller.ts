import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';
import { UserRole } from '../users/user-role.enum';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() dto: LoginDto): Promise<LoginResponseDto> {
    return this.authService.login(dto);
  }

  @Get('admin-check')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminCheck(): Promise<{ message: string }> {
    return { message: 'Admin access confirmed' };
  }
}
