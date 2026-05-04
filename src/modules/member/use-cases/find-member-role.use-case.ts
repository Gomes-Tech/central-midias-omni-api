import { NotFoundException } from '@common/filters';
import { Inject, Injectable } from '@nestjs/common';
import { MemberRepository } from '../repository';

@Injectable()
export class FindMemberRoleUseCase {
  constructor(
    @Inject('MemberRepository')
    private readonly memberRepository: MemberRepository,
  ) {}

  async execute(organizationId: string, userId: string) {
    const role = await this.memberRepository.findMemberRole(
      organizationId,
      userId,
    );

    if (!role) {
      throw new NotFoundException('Membro não encontrado');
    }

    return role;
  }
}
