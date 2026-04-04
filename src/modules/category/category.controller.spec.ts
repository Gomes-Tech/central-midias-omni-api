import {
  CategoryPermissionGuard,
  PlatformPermissionGuard,
} from '@common/guards';
import { Test, TestingModule } from '@nestjs/testing';
import { CategoryController } from './category.controller';
import {
  makeCreateCategoryDTO,
  makeUpdateCategoryDTO,
} from './use-cases/test-helpers';
import {
  CreateCategoryUseCase,
  DeleteCategoryUseCase,
  FindAllCategoriesUseCase,
  FindCategoryByIdUseCase,
  FindCategoryTreeBySlugUseCase,
  FindCategoryTreeUseCase,
  UpdateCategoryUseCase,
} from './use-cases';

describe('CategoryController', () => {
  let controller: CategoryController;
  let createCategoryUseCase: { execute: jest.Mock };
  let deleteCategoryUseCase: { execute: jest.Mock };
  let findAllCategoriesUseCase: { execute: jest.Mock };
  let findCategoryByIdUseCase: { execute: jest.Mock };
  let findCategoryTreeBySlugUseCase: { execute: jest.Mock };
  let findCategoryTreeUseCase: { execute: jest.Mock };
  let updateCategoryUseCase: { execute: jest.Mock };

  beforeEach(async () => {
    createCategoryUseCase = { execute: jest.fn() };
    deleteCategoryUseCase = { execute: jest.fn() };
    findAllCategoriesUseCase = { execute: jest.fn() };
    findCategoryByIdUseCase = { execute: jest.fn() };
    findCategoryTreeBySlugUseCase = { execute: jest.fn() };
    findCategoryTreeUseCase = { execute: jest.fn() };
    updateCategoryUseCase = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoryController],
      providers: [
        { provide: CreateCategoryUseCase, useValue: createCategoryUseCase },
        { provide: DeleteCategoryUseCase, useValue: deleteCategoryUseCase },
        {
          provide: FindAllCategoriesUseCase,
          useValue: findAllCategoriesUseCase,
        },
        {
          provide: FindCategoryByIdUseCase,
          useValue: findCategoryByIdUseCase,
        },
        {
          provide: FindCategoryTreeBySlugUseCase,
          useValue: findCategoryTreeBySlugUseCase,
        },
        { provide: FindCategoryTreeUseCase, useValue: findCategoryTreeUseCase },
        { provide: UpdateCategoryUseCase, useValue: updateCategoryUseCase },
      ],
    })
      .overrideGuard(PlatformPermissionGuard)
      .useValue({ canActivate: jest.fn().mockResolvedValue(true) })
      .overrideGuard(CategoryPermissionGuard)
      .useValue({ canActivate: jest.fn().mockResolvedValue(true) })
      .compile();

    controller = module.get<CategoryController>(CategoryController);
  });

  describe('findAll', () => {
    it('deve usar filtros vazios quando query não for passada', async () => {
      findAllCategoriesUseCase.execute.mockResolvedValue({ data: [], total: 0 });

      await controller.findAll('org-1');

      expect(findAllCategoriesUseCase.execute).toHaveBeenCalledWith('org-1', {});
    });

    it('deve delegar ao FindAllCategoriesUseCase com org e filtros', async () => {
      const payload = { data: [], total: 0 };
      const filters = { searchTerm: 'x' };
      findAllCategoriesUseCase.execute.mockResolvedValue(payload);

      const result = await controller.findAll('org-1', filters);

      expect(result).toBe(payload);
      expect(findAllCategoriesUseCase.execute).toHaveBeenCalledWith(
        'org-1',
        filters,
      );
    });
  });

  describe('findTree', () => {
    it('deve delegar ao FindCategoryTreeUseCase', async () => {
      findCategoryTreeUseCase.execute.mockResolvedValue([]);

      await controller.findTree('org-1', 'user-1');

      expect(findCategoryTreeUseCase.execute).toHaveBeenCalledWith(
        'org-1',
        'user-1',
      );
    });
  });

  describe('findBySlug', () => {
    it('deve delegar ao FindCategoryTreeBySlugUseCase', async () => {
      findCategoryTreeBySlugUseCase.execute.mockResolvedValue({});

      await controller.findBySlug('slug-x', 'org-1', 'user-1');

      expect(findCategoryTreeBySlugUseCase.execute).toHaveBeenCalledWith(
        'slug-x',
        'org-1',
        'user-1',
      );
    });
  });

  describe('findById', () => {
    it('deve delegar ao FindCategoryByIdUseCase', async () => {
      findCategoryByIdUseCase.execute.mockResolvedValue({ id: 'c1' });

      await controller.findById('c1', 'org-1');

      expect(findCategoryByIdUseCase.execute).toHaveBeenCalledWith(
        'c1',
        'org-1',
      );
    });
  });

  describe('create', () => {
    it('deve delegar ao CreateCategoryUseCase', async () => {
      const dto = makeCreateCategoryDTO();
      createCategoryUseCase.execute.mockResolvedValue(undefined);

      await controller.create(dto, 'org-1', 'user-1');

      expect(createCategoryUseCase.execute).toHaveBeenCalledWith(
        'org-1',
        dto,
        'user-1',
      );
    });
  });

  describe('update', () => {
    it('deve delegar ao UpdateCategoryUseCase', async () => {
      const dto = makeUpdateCategoryDTO({ name: 'Novo' });
      updateCategoryUseCase.execute.mockResolvedValue(undefined);

      await controller.update('c1', dto, 'org-1', 'user-1');

      expect(updateCategoryUseCase.execute).toHaveBeenCalledWith(
        'c1',
        'org-1',
        dto,
        'user-1',
      );
    });
  });

  describe('delete', () => {
    it('deve delegar ao DeleteCategoryUseCase', async () => {
      deleteCategoryUseCase.execute.mockResolvedValue(undefined);

      await controller.delete('c1', 'org-1', 'user-1');

      expect(deleteCategoryUseCase.execute).toHaveBeenCalledWith(
        'c1',
        'org-1',
        'user-1',
      );
    });
  });
});
