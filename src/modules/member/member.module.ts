import { PlatformPermissionGuard } from '@common/guards';
import { RolesModule } from '@modules/roles';
import { UserModule } from '@modules/user';
import { Module } from '@nestjs/common';
import { MemberController } from './member.controller';
import { MemberRepository } from './repository';
import {
  AddUserMemberUseCase,
  CreateMemberWithUserUseCase,
  DeleteMemberUseCase,
  FindAllMembersUseCase,
  FindMemberByIdUseCase,
  UpdateMemberUseCase,
} from './use-cases';

@Module({
  imports: [UserModule, RolesModule],
  controllers: [MemberController],
  providers: [
    PlatformPermissionGuard,
    FindAllMembersUseCase,
    FindMemberByIdUseCase,
    AddUserMemberUseCase,
    CreateMemberWithUserUseCase,
    UpdateMemberUseCase,
    DeleteMemberUseCase,
    MemberRepository,
    {
      provide: 'MemberRepository',
      useExisting: MemberRepository,
    },
  ],
  exports: [
    FindAllMembersUseCase,
    FindMemberByIdUseCase,
    AddUserMemberUseCase,
    CreateMemberWithUserUseCase,
    UpdateMemberUseCase,
    DeleteMemberUseCase,
    MemberRepository,
    {
      provide: 'MemberRepository',
      useExisting: MemberRepository,
    },
  ],
})
export class MemberModule {}
