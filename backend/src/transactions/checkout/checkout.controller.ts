import { Body, Controller, Post, UseGuards, Req } from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { CheckoutRequestDto } from './dto/checkout-request.dto';
import { CheckoutResponseDto } from './dto/checkout-response.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { JwtPayload } from '../../auth/jwt.strategy';

@Controller('checkout')
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async checkout(
    @Body() dto: CheckoutRequestDto,
    @Req() req: { user: JwtPayload },
  ): Promise<CheckoutResponseDto> {
    const cashierName = req.user.username;
    return this.checkoutService.checkout(dto, cashierName);
  }
}
