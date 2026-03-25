import { Module } from '@nestjs/common';
import { UserModule } from '@modules/user';
import { RolesRepository } from './repository';
import { RolesController } from './roles.controller';
import {
  CreateRoleUseCase,
  DeleteRoleUseCase,
  FindAllRolesUseCase,
  FindRoleByIdUseCase,
  FindRoleByNameUseCase,
  FindRoleByUserIdUseCase,
  UpdateRoleUseCase,
} from './use-cases';

@Module({
  imports: [UserModule],
  controllers: [RolesController],
  providers: [
    RolesRepository,
    FindAllRolesUseCase,
    FindRoleByIdUseCase,
    FindRoleByUserIdUseCase,
    FindRoleByNameUseCase,
    CreateRoleUseCase,
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
