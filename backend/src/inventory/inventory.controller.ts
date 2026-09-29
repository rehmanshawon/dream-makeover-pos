import { Body, Controller, Get, GoneException, Param, Post, Req, UseGuards } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { StockInDto } from './dto/stock-in.dto';
import { AdjustmentDto } from './dto/adjustment.dto';
import { StockMovementResponseDto } from './dto/stock-movement-response.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user-role.enum';
import { JwtPayload } from '../auth/jwt.strategy';
import { LowStockProductDto } from './dto/low-stock-product.dto';
import { InventoryStatsDto } from './dto/inventory-stats.dto';
import { CreateCostRevaluationDto } from './dto/create-cost-revaluation.dto';
import { TimeTrustGuard } from '../time-trust/time-trust.guard';

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
    void dto;
    void req;
    throw new GoneException('Use POST /purchases to receive stock with cost and accounting.');
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

  @Post('revaluations')
  @UseGuards(JwtAuthGuard, RolesGuard, TimeTrustGuard)
  @Roles(UserRole.ADMIN)
  async revalueCost(@Body() dto: CreateCostRevaluationDto, @Req() req: { user: JwtPayload }) {
    return this.inventoryService.revalueCost(dto, req.user.username);
  }

  @Get('low-stock')
  @UseGuards(JwtAuthGuard)
  async lowStock(): Promise<LowStockProductDto[]> {
    return this.inventoryService.findLowStock();
  }

  @Get('out-of-stock')
  @UseGuards(JwtAuthGuard)
  async outOfStock(): Promise<LowStockProductDto[]> {
    return this.inventoryService.findOutOfStock();
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  async stats(): Promise<InventoryStatsDto> {
    return this.inventoryService.getStats();
  }

  @Get('products/:productId/history')
  @UseGuards(JwtAuthGuard)
  async history(@Param('productId') productId: string): Promise<StockMovementResponseDto[]> {
    return this.inventoryService.historyForProduct(productId);
  }
}
