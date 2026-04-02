import { CategoryRoleAccessModule } from '@modules/category-role-access/category-role-access.module';
import { Module } from '@nestjs/common';
import { RolesRepository } from './repository';
import { RolesController } from './roles.controller';
import {
  CreateGlobalRoleUseCase,
  CreateRoleUseCase,
  DeleteRoleUseCase,
  FindAllRolesUseCase,
  FindRoleByIdUseCase,
  FindRoleByNameUseCase,
  UpdateRoleUseCase,
} from './use-cases';

@Module({
  imports: [CategoryRoleAccessModule],
  controllers: [RolesController],
  providers: [
    RolesRepository,
    FindAllRolesUseCase,
    FindRoleByIdUseCase,
    FindRoleByNameUseCase,
    CreateRoleUseCase,
    CreateGlobalRoleUseCase,
    UpdateRoleUseCase,
    DeleteRoleUseCase,
    {
      provide: 'RolesRepository',
      useExisting: RolesRepository,
    },
  ],
  exports: [
    FindAllRolesUseCase,
    FindRoleByIdUseCase,
    FindRoleByNameUseCase,
    CreateRoleUseCase,
    CreateGlobalRoleUseCase,
    UpdateRoleUseCase,
    DeleteRoleUseCase,
    RolesRepository,
    {
      provide: 'RolesRepository',
      useExisting: RolesRepository,
    },
  ],
})
export class RolesModule {}
