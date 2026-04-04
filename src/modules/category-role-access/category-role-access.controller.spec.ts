import { PlatformPermissionGuard } from '@common/guards';
import { Test, TestingModule } from '@nestjs/testing';
import { CategoryRoleAccessController } from './category-role-access.controller';
import { CreateCategoryRoleAccessDTO } from './dto/create-category-role-access.dto';
import { CreateCategoryRoleAccessUseCase } from './use-cases/create-category-role-access.use-case';
import { DeleteCategoryRoleAccessUseCase } from './use-cases/delete-category-role-access.use-case';
import { FindAllCategoryRoleAccessesUseCase } from './use-cases/find-all-category-role-accesses.use-case';
import { FindRolesByCategoryUseCase } from './use-cases/find-roles-by-category.use-case';

describe('CategoryRoleAccessController', () => {
  let controller: CategoryRoleAccessController;
  let createUseCase: { execute: jest.Mock };
  let deleteUseCase: { execute: jest.Mock };
  let findAllUseCase: { execute: jest.Mock };
  let findRolesByCategoryUseCase: { execute: jest.Mock };

  beforeEach(async () => {
    createUseCase = { execute: jest.fn() };
    deleteUseCase = { execute: jest.fn() };
    findAllUseCase = { execute: jest.fn() };
    findRolesByCategoryUseCase = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoryRoleAccessController],
      providers: [
        {
          provide: CreateCategoryRoleAccessUseCase,
          useValue: createUseCase,
        },
        {
          provide: DeleteCategoryRoleAccessUseCase,
          useValue: deleteUseCase,
        },
        {
          provide: FindAllCategoryRoleAccessesUseCase,
          useValue: findAllUseCase,
        },
        {
          provide: FindRolesByCategoryUseCase,
          useValue: findRolesByCategoryUseCase,
        },
      ],
    })
      .overrideGuard(PlatformPermissionGuard)
      .useValue({ canActivate: jest.fn().mockResolvedValue(true) })
      .compile();

    controller = module.get<CategoryRoleAccessController>(
      CategoryRoleAccessController,
    );
  });

  describe('findAll', () => {
    it('deve delegar ao FindAllCategoryRoleAccessesUseCase', async () => {
      findAllUseCase.execute.mockResolvedValue([]);

      await controller.findAll('org-1');

      expect(findAllUseCase.execute).toHaveBeenCalledWith('org-1');
    });
  });

  describe('findRolesByCategory', () => {
    it('deve delegar ao FindRolesByCategoryUseCase', async () => {
      findRolesByCategoryUseCase.execute.mockResolvedValue([]);

      await controller.findRolesByCategory('cat-1', 'org-1');

      expect(findRolesByCategoryUseCase.execute).toHaveBeenCalledWith(
        'cat-1',
        'org-1',
      );
    });
  });

  describe('create', () => {
    it('deve delegar ao CreateCategoryRoleAccessUseCase', async () => {
      const dto = {
        categoryId: 'cat-1',
        roleId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      } as CreateCategoryRoleAccessDTO;
      createUseCase.execute.mockResolvedValue({});

      await controller.create(dto, 'org-1');

      expect(createUseCase.execute).toHaveBeenCalledWith('org-1', dto);
    });
  });

  describe('delete', () => {
    it('deve delegar ao DeleteCategoryRoleAccessUseCase', async () => {
      deleteUseCase.execute.mockResolvedValue(undefined);

      await controller.delete('id-1', 'org-1');

      expect(deleteUseCase.execute).toHaveBeenCalledWith('id-1', 'org-1');
    });
  });
});
