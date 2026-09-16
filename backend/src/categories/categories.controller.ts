import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoryKind } from './category-kind.enum';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryResponseDto, CategoryNodeDto } from './dto/category-response.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user-role.enum';

@Controller('categories')
@UseGuards(JwtAuthGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async create(@Body() dto: CreateCategoryDto): Promise<CategoryResponseDto> {
    return this.categoriesService.create(dto);
  }

  @Get()
  async findAll(@Query('kind') kind?: CategoryKind): Promise<CategoryResponseDto[]> {
    return this.categoriesService.findAll(kind);
  }

  @Get('tree')
  async findTree(@Query('kind') kind?: CategoryKind): Promise<CategoryNodeDto[]> {
    return this.categoriesService.findTree(kind);
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<CategoryResponseDto> {
    return this.categoriesService.findById(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    return this.categoriesService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(204)
  async remove(@Param('id') id: string): Promise<void> {
    return this.categoriesService.remove(id);
  }
}
