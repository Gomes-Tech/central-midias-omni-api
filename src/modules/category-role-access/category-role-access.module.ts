import { PlatformPermissionGuard } from '@common/guards';
import { Module } from '@nestjs/common';
import { CategoryRoleAccessController } from './category-role-access.controller';
import { CategoryRoleAccessRepository } from './repository';
import { CreateCategoryRoleAccessUseCase } from './use-cases/create-category-role-access.use-case';
import { DeleteCategoryRoleAccessUseCase } from './use-cases/delete-category-role-access.use-case';
import { FindAllCategoryRoleAccessesUseCase } from './use-cases/find-all-category-role-accesses.use-case';
import { FindRolesByCategoryUseCase } from './use-cases/find-roles-by-category.use-case';

@Module({
  controllers: [CategoryRoleAccessController],
  providers: [
    PlatformPermissionGuard,
    CategoryRoleAccessRepository,
    CreateCategoryRoleAccessUseCase,
    DeleteCategoryRoleAccessUseCase,
    FindAllCategoryRoleAccessesUseCase,
    FindRolesByCategoryUseCase,
    {
      provide: 'CategoryRoleAccessRepository',
      useExisting: CategoryRoleAccessRepository,
    },
  ],
  exports: [
    CategoryRoleAccessRepository,
    CreateCategoryRoleAccessUseCase,
    DeleteCategoryRoleAccessUseCase,
    FindAllCategoryRoleAccessesUseCase,
    FindRolesByCategoryUseCase,
    {
      provide: 'CategoryRoleAccessRepository',
      useExisting: CategoryRoleAccessRepository,
    },
  ],
})
export class CategoryRoleAccessModule {}
