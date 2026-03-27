import { BadRequestException } from '@common/filters';
import { FindRoleByIdUseCase } from '@modules/roles/use-cases/find-role-by-id.use-case';
import { FindUserByIdUseCase } from '@modules/user';
import { Inject, Injectable } from '@nestjs/common';
import { CreateMemberDTO } from '../dto';
import { MemberRepository } from '../repository';

@Injectable()
export class CreateMemberUseCase {
  constructor(
    @Inject('MemberRepository')
    private readonly memberRepository: MemberRepository,
    private readonly findUserByIdUseCase: FindUserByIdUseCase,
    private readonly findRoleByIdUseCase: FindRoleByIdUseCase,
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

    await this.findRoleByIdUseCase.execute(data.roleId);

    return this.memberRepository.create(organizationId, data, userId);
  }
}
