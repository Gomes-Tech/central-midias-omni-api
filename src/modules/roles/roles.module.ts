import { Module } from '@nestjs/common';
import { RolesController } from './roles.controller';
import { RolesRepository } from './repository';
import {
  CreateRoleUseCase,
  DeleteRoleUseCase,
  FindAllRolesUseCase,
  FindRoleByCodeUseCase,
  FindRoleByIdUseCase,
  UpdateRoleUseCase,
} from './use-cases';

@Module({
  controllers: [RolesController],
  providers: [
    RolesRepository,
    FindAllRolesUseCase,
    FindRoleByIdUseCase,
    FindRoleByCodeUseCase,
    CreateRoleUseCase,
    UpdateRoleUseCase,
    DeleteRoleUseCase,
  ],
  exports: [
    RolesRepository,
    FindAllRolesUseCase,
    FindRoleByIdUseCase,
    FindRoleByCodeUseCase,
  ],
})
export class RolesModule {}
