import { PlatformPermissionGuard } from '@common/guards';
import { Module } from '@nestjs/common';
import { CategoryRoleAccessController } from './category-role-access.controller';
import { CategoryRoleAccessRepository } from './repository';
import { CreateCategoryRoleAccessUseCase } from './use-cases/create-category-role-access.use-case';
import { DeleteCategoryRoleAccessUseCase } from './use-cases/delete-category-role-access.use-case';
import { FindAllCategoryRoleAccessesUseCase } from './use-cases/find-all-category-role-accesses.use-case';
import { FindRolesByCategoryUseCase } from './use-cases/find-roles-by-category.use-case';
import { SyncCategoryGlobalRolesUseCase } from './use-cases/sync-category-global-roles.use-case';
import { SyncGlobalRoleCategoryAccessesUseCase } from './use-cases/sync-global-role-category-accesses.use-case';

@Module({
  controllers: [CategoryRoleAccessController],
  providers: [
    PlatformPermissionGuard,
    CategoryRoleAccessRepository,
    CreateCategoryRoleAccessUseCase,
    DeleteCategoryRoleAccessUseCase,
    FindAllCategoryRoleAccessesUseCase,
    FindRolesByCategoryUseCase,
    SyncGlobalRoleCategoryAccessesUseCase,
    SyncCategoryGlobalRolesUseCase,
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
    SyncGlobalRoleCategoryAccessesUseCase,
    SyncCategoryGlobalRolesUseCase,
    {
      provide: 'CategoryRoleAccessRepository',
      useExisting: CategoryRoleAccessRepository,
    },
  ],
})
export class CategoryRoleAccessModule {}
