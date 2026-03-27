import { PlatformPermissionGuard } from '@common/guards';
import { Module } from '@nestjs/common';
import { CategoryController } from './category.controller';
import { CategoryRepository } from './repository';
import {
  CreateCategoryUseCase,
  DeleteCategoryUseCase,
  FindAllCategoriesUseCase,
  FindCategoryByIdUseCase,
  FindCategoryTreeUseCase,
  UpdateCategoryUseCase,
} from './use-cases';

@Module({
  controllers: [CategoryController],
  providers: [
    PlatformPermissionGuard,
    CategoryRepository,
    FindAllCategoriesUseCase,
    FindCategoryTreeUseCase,
    FindCategoryByIdUseCase,
    CreateCategoryUseCase,
    UpdateCategoryUseCase,
    DeleteCategoryUseCase,
    {
      provide: 'CategoryRepository',
      useExisting: CategoryRepository,
    },
  ],
  exports: [
    CategoryRepository,
    FindAllCategoriesUseCase,
    FindCategoryTreeUseCase,
    FindCategoryByIdUseCase,
    CreateCategoryUseCase,
    UpdateCategoryUseCase,
    DeleteCategoryUseCase,
    {
      provide: 'CategoryRepository',
      useExisting: CategoryRepository,
    },
  ],
})
export class CategoryModule {}
