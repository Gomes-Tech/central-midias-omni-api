import { BadRequestException } from '@common/filters';
import { FindRoleByIdUseCase } from '@modules/roles/use-cases/find-role-by-id.use-case';
import { Injectable } from '@nestjs/common';
import { UpdateMemberDTO } from '../dto';
import { MemberRepository } from '../repository';
import { FindMemberByIdUseCase } from './find-member-by-id.use-case';

@Injectable()
export class UpdateMemberUseCase {
  constructor(
    private readonly memberRepository: MemberRepository,
    private readonly findMemberByIdUseCase: FindMemberByIdUseCase,
    private readonly findRoleByIdUseCase: FindRoleByIdUseCase,
  ) {}

  async execute(
    id: string,
    organizationId: string,
    data: UpdateMemberDTO,
    userId: string,
  ): Promise<void> {
    const member = await this.findMemberByIdUseCase.execute(id, organizationId);

    if (!data.roleId) {
      await this.memberRepository.update(id, organizationId, data, userId);
      return;
    }

    if (member.roleId === data.roleId) {
      throw new BadRequestException('O membro já possui o perfil informado');
    }

    const role = await this.findRoleByIdUseCase.execute(
      data.roleId,
      organizationId,
    );

    const isGlobalUser = member.globalRoleId !== null;

    if (isGlobalUser !== role.canAccessBackoffice) {
      throw new BadRequestException(
        'O tipo do usuário é incompatível com o perfil selecionado',
      );
    }

    await this.memberRepository.update(id, organizationId, data, userId);
  }
}
