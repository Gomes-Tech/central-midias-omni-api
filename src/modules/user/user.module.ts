import { Module } from '@nestjs/common';
import { UserRepository } from './repository';
import {
  CreateUserUseCase,
  DeleteUserUseCase,
  FindAllUsersUseCase,
  FindUserByEmailUseCase,
  FindUserByIdUseCase,
  FindUserRoleUseCase,
  UpdateUserUseCase,
} from './use-cases';
import { PlatformPermissionGuard } from '@common/guards';
import { AdminUsersController } from './admin-user.controller';
import { UserController } from './user.controller';

@Module({
  controllers: [UserController, AdminUsersController],
  providers: [
    PlatformPermissionGuard,
    FindAllUsersUseCase,
    FindUserByIdUseCase,
    FindUserByEmailUseCase,
    FindUserRoleUseCase,
    CreateUserUseCase,
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
    UpdateUserUseCase,
    UserRepository,
    {
      provide: 'UserRepository',
      useExisting: UserRepository,
    },
  ],
})
export class UserModule {}
