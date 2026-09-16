import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './category.entity';
import { CategoryKind } from './category-kind.enum';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryResponseDto, CategoryNodeDto } from './dto/category-response.dto';

/**
 * Converts a category name into a URL-safe slug.
 *
 * Lowercases, strips characters outside [a-z0-9], and replaces
 * whitespace runs with single hyphens.
 */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  async create(dto: CreateCategoryDto): Promise<CategoryResponseDto> {
    const slug = slugify(dto.name);
    if (!slug) {
      throw new BadRequestException('Category name must contain at least one letter or number');
    }

    if (dto.parentId) {
      const parent = await this.categoryRepository.findOne({
        where: { id: dto.parentId },
      });
      if (!parent) {
        throw new BadRequestException('Parent category not found');
      }
      if (parent.kind !== dto.kind) {
        throw new BadRequestException('Parent category kind must match the child category kind');
      }
    }

    const existing = await this.categoryRepository.findOne({
      where: { kind: dto.kind, slug },
    });
    if (existing) {
      throw new ConflictException('A category with this name already exists in this kind');
    }

    const category = this.categoryRepository.create({
      name: dto.name,
      slug,
      kind: dto.kind,
      parentId: dto.parentId ?? null,
      displayOrder: dto.displayOrder ?? 0,
      active: dto.active ?? true,
    });

    const saved = await this.categoryRepository.save(category);
    return this.toResponse(saved);
  }

  async findAll(kind?: CategoryKind): Promise<CategoryResponseDto[]> {
    const where = kind ? { kind } : {};
    const categories = await this.categoryRepository.find({
      where,
      order: { kind: 'ASC', displayOrder: 'ASC', name: 'ASC' },
    });
    return categories.map((c) => this.toResponse(c));
  }

  async findTree(kind?: CategoryKind): Promise<CategoryNodeDto[]> {
    const categories = await this.findAll(kind);
    return this.buildTree(categories, null);
  }

  async findById(id: string): Promise<CategoryResponseDto> {
    const category = await this.categoryRepository.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return this.toResponse(category);
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<CategoryResponseDto> {
    const category = await this.categoryRepository.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    if (dto.name !== undefined && dto.name !== category.name) {
      const slug = slugify(dto.name);
      if (!slug) {
        throw new BadRequestException('Category name must contain at least one letter or number');
      }

      const duplicate = await this.categoryRepository.findOne({
        where: { kind: category.kind, slug },
      });
      if (duplicate && duplicate.id !== category.id) {
        throw new ConflictException('A category with this name already exists in this kind');
      }

      category.name = dto.name;
      category.slug = slug;
    }

    if (dto.displayOrder !== undefined) {
      category.displayOrder = dto.displayOrder;
    }
    if (dto.active !== undefined) {
      category.active = dto.active;
    }

    const saved = await this.categoryRepository.save(category);
    return this.toResponse(saved);
  }

  /**
   * Physically deletes a category. Refuses if it has children or if
   * any product or service references it. In both cases, the admin
   * should use `active: false` to hide the category without breaking
   * references.
   */
  async remove(id: string): Promise<void> {
    const category = await this.categoryRepository.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const childCount = await this.categoryRepository.count({
      where: { parentId: id },
    });
    if (childCount > 0) {
      throw new ConflictException('Category has sub-categories and cannot be deleted');
    }

    // Products and services use RESTRICT on their FK, so the delete
    // would fail there anyway. We surface a friendlier message.
    try {
      await this.categoryRepository.remove(category);
    } catch (err) {
      throw new ConflictException(
        'Category is in use by products or services and cannot be deleted',
      );
    }
  }

  /**
   * Loads a set of categories by ID, returning a lookup map. Used by
   * ProductsService and SalonServicesService to resolve category names
   * without N+1 queries.
   */
  async loadByIds(ids: string[]): Promise<Map<string, Category>> {
    if (ids.length === 0) return new Map();
    const unique = Array.from(new Set(ids));
    const categories = await this.categoryRepository
      .createQueryBuilder('c')
      .where('c.id IN (:...ids)', { ids: unique })
      .getMany();
    return new Map(categories.map((c) => [c.id, c]));
  }

  /**
   * Looks up a category by slug for a given kind. Used to resolve the
   * legacy `category` string sent by the current frontend.
   */
  async findBySlug(slug: string, kind: CategoryKind): Promise<Category | null> {
    return this.categoryRepository.findOne({ where: { slug, kind } });
  }

  private buildTree(flat: CategoryResponseDto[], parentId: string | null): CategoryNodeDto[] {
    return flat
      .filter((c) => c.parentId === parentId)
      .map((c) => ({
        ...c,
        children: this.buildTree(flat, c.id),
      }));
  }

  private toResponse(category: Category): CategoryResponseDto {
    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      kind: category.kind,
      parentId: category.parentId,
      displayOrder: category.displayOrder,
      active: category.active,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }
}
