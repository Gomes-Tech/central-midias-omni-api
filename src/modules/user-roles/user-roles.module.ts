import { Module } from '@nestjs/common';
import { RolesModule } from '@modules/roles';
import { UserRolesController } from './user-roles.controller';
import { UserRolesRepository } from './repository';
import {
  AssignUserRoleUseCase,
  FindPrimaryUserRoleUseCase,
  FindUserRolesUseCase,
  ReplaceUserRolesUseCase,
} from './use-cases';

@Module({
  imports: [RolesModule],
  controllers: [UserRolesController],
  providers: [
    UserRolesRepository,
    AssignUserRoleUseCase,
    FindPrimaryUserRoleUseCase,
    FindUserRolesUseCase,
    ReplaceUserRolesUseCase,
  ],
  exports: [
    UserRolesRepository,
    FindPrimaryUserRoleUseCase,
    FindUserRolesUseCase,
    ReplaceUserRolesUseCase,
  ],
})
export class UserRolesModule {}
