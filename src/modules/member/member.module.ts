import { PlatformPermissionGuard } from '@common/guards';
import { CategoryRoleAccessModule } from '@modules/category-role-access/category-role-access.module';
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
  FindMemberRoleDetailsUseCase,
  FindMemberRoleUseCase,
  ListImportantDatesUseCase,
  UpdateMemberUseCase,
} from './use-cases';

@Module({
  imports: [UserModule, RolesModule, CategoryRoleAccessModule],
  controllers: [MemberController],
  providers: [
    PlatformPermissionGuard,
    FindAllMembersUseCase,
    FindMemberByIdUseCase,
    FindMemberRoleUseCase,
    FindMemberRoleDetailsUseCase,
    AddUserMemberUseCase,
    CreateMemberWithUserUseCase,
    UpdateMemberUseCase,
    DeleteMemberUseCase,
    ListImportantDatesUseCase,
    MemberRepository,
    {
      provide: 'MemberRepository',
      useExisting: MemberRepository,
    },
  ],
  exports: [
    FindAllMembersUseCase,
    FindMemberByIdUseCase,
    FindMemberRoleUseCase,
    FindMemberRoleDetailsUseCase,
    AddUserMemberUseCase,
    CreateMemberWithUserUseCase,
    UpdateMemberUseCase,
    DeleteMemberUseCase,
    ListImportantDatesUseCase,
    MemberRepository,
    {
      provide: 'MemberRepository',
      useExisting: MemberRepository,
    },
  ],
})
export class MemberModule {}
