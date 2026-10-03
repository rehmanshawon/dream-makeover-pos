import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { Category } from '../src/categories/category.entity';
import { CategoriesService } from '../src/categories/categories.service';
import { CategoryKind } from '../src/categories/category-kind.enum';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let repository: jest.Mocked<Partial<Repository<Category>>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: getRepositoryToken(Category),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(CategoriesService);
    repository = module.get(getRepositoryToken(Category));
  });

  it('stores the uploaded icon URL on a top-level category', async () => {
    const category = {
      id: 'category-1',
      name: 'Bridal',
      slug: 'bridal',
      kind: CategoryKind.SERVICE,
      parentId: null,
      iconUrl: '/uploads/category-icons/bridal.png',
      displayOrder: 0,
      active: true,
    } as Category;
    (repository.findOne as jest.Mock).mockResolvedValue(null);
    (repository.create as jest.Mock).mockReturnValue(category);
    (repository.save as jest.Mock).mockResolvedValue(category);

    const result = await service.create(
      { name: 'Bridal', kind: CategoryKind.SERVICE },
      category.iconUrl,
    );

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ iconUrl: '/uploads/category-icons/bridal.png' }),
    );
    expect(result.iconUrl).toBe('/uploads/category-icons/bridal.png');
  });

  it('rejects icon URLs for child categories', async () => {
    await expect(
      service.create(
        { name: 'Bridal makeup', kind: CategoryKind.SERVICE, parentId: 'parent-1' },
        '/uploads/category-icons/bridal.png',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.save).not.toHaveBeenCalled();
  });
});