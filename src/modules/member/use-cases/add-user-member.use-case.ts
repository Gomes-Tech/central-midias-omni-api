import { BadRequestException, NotFoundException } from '@common/filters';
import { SyncGlobalRoleCategoryAccessesUseCase } from '@modules/category-role-access/use-cases/sync-global-role-category-accesses.use-case';
import { FindGlobalRoleByIdUseCase } from '@modules/roles/use-cases/find-global-role-by-id.use-case';
import { FindRoleByIdUseCase } from '@modules/roles/use-cases/find-role-by-id.use-case';
import { FindUserByIdUseCase } from '@modules/user';
import { Inject, Injectable } from '@nestjs/common';
import { CreateMemberDTO } from '../dto';
import { MemberRepository } from '../repository';

@Injectable()
export class AddUserMemberUseCase {
  constructor(
    @Inject('MemberRepository')
    private readonly memberRepository: MemberRepository,
    private readonly findUserByIdUseCase: FindUserByIdUseCase,
    private readonly findRoleByIdUseCase: FindRoleByIdUseCase,
    private readonly findGlobalRoleByIdUseCase: FindGlobalRoleByIdUseCase,
    private readonly syncGlobalRoleCategoryAccessesUseCase: SyncGlobalRoleCategoryAccessesUseCase,
  ) {}

  async execute(organizationId: string, data: CreateMemberDTO, userId: string) {
    const existingMember =
      await this.memberRepository.findByOrganizationAndUser(
        organizationId,
        data.userId,
      );

    if (existingMember) {
      throw new BadRequestException(
        'Usuário já está vinculado a esta organização',
      );
    }

    const memberUser = await this.findUserByIdUseCase.execute(data.userId);

    if (!memberUser.isActive || memberUser.isDeleted) {
      throw new BadRequestException(
        'Não é possível vincular um usuário inativo ou removido',
      );
    }

    await this.validateAndSyncRole(data.roleId, organizationId);

    return this.memberRepository.create(organizationId, data, userId);
  }

  private async validateAndSyncRole(
    roleId: string,
    organizationId: string,
  ): Promise<void> {
    try {
      await this.findRoleByIdUseCase.execute(roleId, organizationId);
      return;
    } catch (error) {
      if (!(error instanceof NotFoundException)) {
        throw error;
      }
    }

    await this.findGlobalRoleByIdUseCase.execute(roleId);
    await this.syncGlobalRoleCategoryAccessesUseCase.execute(
      roleId,
      organizationId,
    );
  }
}
