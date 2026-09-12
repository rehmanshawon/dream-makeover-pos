import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { StockInDto } from './dto/stock-in.dto';
import { AdjustmentDto } from './dto/adjustment.dto';
import { StockMovementResponseDto } from './dto/stock-movement-response.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user-role.enum';
import { JwtPayload } from '../auth/jwt.strategy';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('stock-in')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async stockIn(
    @Body() dto: StockInDto,
    @Req() req: { user: JwtPayload },
  ): Promise<StockMovementResponseDto> {
    return this.inventoryService.stockIn(dto, req.user.username);
  }

  @Post('adjust')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adjust(
    @Body() dto: AdjustmentDto,
    @Req() req: { user: JwtPayload },
  ): Promise<StockMovementResponseDto> {
    return this.inventoryService.adjust(dto, req.user.username);
  }

  @Get('products/:productId/history')
  @UseGuards(JwtAuthGuard)
  async history(@Param('productId') productId: string): Promise<StockMovementResponseDto[]> {
    return this.inventoryService.historyForProduct(productId);
  }
}
