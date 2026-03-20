import { Module } from '@nestjs/common';
import { UserRolesModule } from '@modules/user-roles';
import { UserRepository } from './repository';
import {
  CreateUserUseCase,
  DeleteUserUseCase,
  FindAllTechniciansUseCase,
  FindAllUsersUseCase,
  FindUserByEmailUseCase,
  FindUserByIdUseCase,
  FindUserByTaxIdentifierUseCase,
  FindUserRoleUseCase,
  UpdateUserUseCase,
} from './use-cases';
import { UserController } from './user.controller';

@Module({
  imports: [UserRolesModule],
  controllers: [UserController],
  providers: [
    FindAllUsersUseCase,
    FindAllTechniciansUseCase,
    FindUserByIdUseCase,
    FindUserByEmailUseCase,
    FindUserRoleUseCase,
    FindUserByTaxIdentifierUseCase,
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
    FindUserByTaxIdentifierUseCase,
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
