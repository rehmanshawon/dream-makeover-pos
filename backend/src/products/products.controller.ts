import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ProductsService, type ProductResponseOptions } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductResponseDto } from './dto/product-response.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user-role.enum';
import type { JwtPayload } from '../auth/jwt.strategy';

/**
 * Derives the visibility options from the authenticated user.
 *
 * Only ADMIN callers receive purchase cost. This is enforced here, on
 * the server, so that no client can retrieve the field without
 * authorization.
 */
function optionsFor(user: JwtPayload): ProductResponseOptions {
  return { includePurchaseCost: user.role === UserRole.ADMIN };
}

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async create(
    @Body() dto: CreateProductDto,
    @Req() req: { user: JwtPayload },
  ): Promise<ProductResponseDto> {
    return this.productsService.create(dto, optionsFor(req.user));
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(
    @Req() req: { user: JwtPayload },
    @Query('category') category?: string,
  ): Promise<ProductResponseDto[]> {
    const options = optionsFor(req.user);
    if (category) {
      return this.productsService.findByCategory(category, options);
    }
    return this.productsService.findAll(options);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findById(
    @Param('id') id: string,
    @Req() req: { user: JwtPayload },
  ): Promise<ProductResponseDto> {
    return this.productsService.findById(id, optionsFor(req.user));
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @Req() req: { user: JwtPayload },
  ): Promise<ProductResponseDto> {
    return this.productsService.update(id, dto, optionsFor(req.user));
  }
}
