import { PlatformPermissionGuard } from '@common/guards';
import { CategoryRoleAccessModule } from '@modules/category-role-access/category-role-access.module';
import { RolesModule } from '@modules/roles';
import { Module } from '@nestjs/common';
import { UserRepository } from './repository';
import {
  CreateGlobalUserUseCase,
  CreateUserUseCase,
  DeleteUserUseCase,
  FindAllUsersUseCase,
  FindGlobalUsersSelectUseCase,
  FindUserByEmailUseCase,
  FindUserByIdUseCase,
  GetMeUseCase,
  UpdateUserUseCase,
} from './use-cases';
import { UserController } from './user.controller';

@Module({
  imports: [RolesModule, CategoryRoleAccessModule],
  controllers: [UserController],
  providers: [
    PlatformPermissionGuard,
    FindAllUsersUseCase,
    FindGlobalUsersSelectUseCase,
    FindUserByIdUseCase,
    GetMeUseCase,
    FindUserByEmailUseCase,
    CreateUserUseCase,
    CreateGlobalUserUseCase,
    UpdateUserUseCase,
    DeleteUserUseCase,
    UserRepository,
    {
      provide: 'UserRepository',
      useExisting: UserRepository,
    },
  ],
  exports: [
    FindUserByIdUseCase,
    FindUserByEmailUseCase,
    CreateUserUseCase,
    GetMeUseCase,
    CreateGlobalUserUseCase,
    UpdateUserUseCase,
    UserRepository,
    {
      provide: 'UserRepository',
      useExisting: UserRepository,
    },
  ],
})
export class UserModule {}
