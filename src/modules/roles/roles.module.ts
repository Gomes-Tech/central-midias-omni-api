import { CategoryRoleAccessModule } from '@modules/category-role-access/category-role-access.module';
import { UserModule } from '@modules/user';
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
  FindRoleByUserIdUseCase,
  UpdateRoleUseCase,
} from './use-cases';

@Module({
  imports: [UserModule, CategoryRoleAccessModule],
  controllers: [RolesController],
  providers: [
    RolesRepository,
    FindAllRolesUseCase,
    FindRoleByIdUseCase,
    FindRoleByUserIdUseCase,
    FindRoleByNameUseCase,
    CreateRoleUseCase,
    CreateGlobalRoleUseCase,
    UpdateRoleUseCase,
    DeleteRoleUseCase,
  ],
  exports: [
    RolesRepository,
    FindAllRolesUseCase,
    FindRoleByIdUseCase,
    FindRoleByUserIdUseCase,
    FindRoleByNameUseCase,
  ],
})
export class RolesModule {}
