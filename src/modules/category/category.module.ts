import { PlatformPermissionGuard } from '@common/guards';
import { CategoryRoleAccessModule } from '@modules/category-role-access/category-role-access.module';
import { Module } from '@nestjs/common';
import { CategoryController } from './category.controller';
import { CategoryRepository } from './repository';
import {
  CreateCategoryUseCase,
  DeleteCategoryUseCase,
  FindAllCategoriesUseCase,
  FindCategoryByIdUseCase,
  FindCategoryTreeBySlugPathUseCase,
  FindCategoryTreeUseCase,
  UpdateCategoryUseCase,
} from './use-cases';

@Module({
  imports: [CategoryRoleAccessModule],
  controllers: [CategoryController],
  providers: [
    PlatformPermissionGuard,
    CategoryRepository,
    FindAllCategoriesUseCase,
    FindCategoryTreeUseCase,
    FindCategoryByIdUseCase,
    FindCategoryTreeBySlugPathUseCase,
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
    FindCategoryTreeBySlugPathUseCase,
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
