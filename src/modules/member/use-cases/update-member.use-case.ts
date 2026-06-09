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
    await this.findMemberByIdUseCase.execute(id, organizationId);

    await this.findRoleByIdUseCase.execute(data.roleId, organizationId);

    await this.memberRepository.update(id, organizationId, data, userId);
  }
}
