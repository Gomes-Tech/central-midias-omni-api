import { PlatformPermissionGuard } from '@common/guards';
import { Module } from '@nestjs/common';
import { UserRepository } from './repository';
import {
  CreateUserUseCase,
  DeleteUserUseCase,
  FindAllUsersUseCase,
  FindUserByEmailUseCase,
  FindUserByIdUseCase,
  UpdateUserUseCase,
} from './use-cases';
import { UserController } from './user.controller';

@Module({
  controllers: [UserController],
  providers: [
    PlatformPermissionGuard,
    FindAllUsersUseCase,
    FindUserByIdUseCase,
    FindUserByEmailUseCase,
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
