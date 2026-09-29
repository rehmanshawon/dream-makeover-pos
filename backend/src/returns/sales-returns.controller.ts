import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { JwtPayload } from '../auth/jwt.strategy';
import { UserRole } from '../users/user-role.enum';
import { TimeTrustGuard } from '../time-trust/time-trust.guard';
import { CreateSalesReturnDto } from './dto/create-sales-return.dto';
import { SalesReturnsService } from './sales-returns.service';

@Controller('sales-returns')
@UseGuards(JwtAuthGuard, RolesGuard, TimeTrustGuard)
@Roles(UserRole.ADMIN)
export class SalesReturnsController {
  constructor(private readonly salesReturnsService: SalesReturnsService) {}

  @Post()
  create(@Body() dto: CreateSalesReturnDto, @Req() req: { user: JwtPayload }) {
    return this.salesReturnsService.create(dto, req.user.username);
  }
}
