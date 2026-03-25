import { Module } from '@nestjs/common';
import { RolesRepository } from './repository';
import { RolesController } from './roles.controller';
import {
  CreateRoleUseCase,
  DeleteRoleUseCase,
  FindAllRolesUseCase,
  FindRoleByIdUseCase,
  FindRoleByNameUseCase,
  UpdateRoleUseCase,
} from './use-cases';

@Module({
  controllers: [RolesController],
  providers: [
    RolesRepository,
    FindAllRolesUseCase,
    FindRoleByIdUseCase,
    FindRoleByNameUseCase,
    CreateRoleUseCase,
    UpdateRoleUseCase,
    DeleteRoleUseCase,
  ],
  exports: [
    RolesRepository,
    FindAllRolesUseCase,
    FindRoleByIdUseCase,
    FindRoleByNameUseCase,
  ],
})
export class RolesModule {}
