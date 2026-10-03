import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { mkdirSync } from 'node:fs';
import { unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
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
  @UseInterceptors(
    FileInterceptor('icon', {
      limits: { fileSize: 5 * 1024 * 1024 },
      storage: diskStorage({
        destination: (_req, _file, callback) => {
          const directory = join(process.cwd(), 'uploads', 'category-icons');
          mkdirSync(directory, { recursive: true });
          callback(null, directory);
        },
        filename: (_req, file, callback) => {
          const extension =
            file.mimetype === 'image/png'
              ? '.png'
              : file.mimetype === 'image/webp'
                ? '.webp'
                : '.jpg';
          callback(null, `${randomUUID()}${extension}`);
        },
      }),
      fileFilter: (_req, file, callback) => {
        if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.mimetype)) {
          callback(new BadRequestException('Icon must be a PNG, JPEG, or WebP image.'), false);
          return;
        }
        callback(null, true);
      },
    }),
  )
  async create(
    @Body() dto: CreateCategoryDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<CategoryResponseDto> {
    if (file && dto.parentId) {
      await unlink(file.path);
      throw new BadRequestException('Only top-level categories can have a sidebar icon');
    }

    try {
      return await this.categoriesService.create(
        dto,
        file ? `/uploads/category-icons/${file.filename}` : null,
      );
    } catch (error) {
      if (file) await unlink(file.path).catch(() => undefined);
      throw error;
    }
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
