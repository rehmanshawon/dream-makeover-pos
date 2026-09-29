import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { JwtPayload } from '../auth/jwt.strategy';
import { UserRole } from '../users/user-role.enum';
import { TimeTrustGuard } from '../time-trust/time-trust.guard';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { CreateSupplierPaymentDto } from './dto/create-supplier-payment.dto';
import { PurchasesService } from './purchases.service';

@Controller('purchases')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Get()
  findAll() {
    return this.purchasesService.findAll();
  }

  @Post()
  @UseGuards(TimeTrustGuard)
  create(@Body() dto: CreatePurchaseDto, @Req() req: { user: JwtPayload }) {
    return this.purchasesService.create(dto, req.user.username);
  }

  @Post('payments')
  @UseGuards(TimeTrustGuard)
  recordPayment(@Body() dto: CreateSupplierPaymentDto, @Req() req: { user: JwtPayload }) {
    return this.purchasesService.recordSupplierPayment(dto, req.user.username);
  }
}
