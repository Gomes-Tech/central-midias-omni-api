import { NotFoundException } from '@common/filters';
import { Inject, Injectable } from '@nestjs/common';
import { MemberRepository } from '../repository';

@Injectable()
export class FindMemberByIdUseCase {
  constructor(
    @Inject('MemberRepository')
    private readonly memberRepository: MemberRepository,
  ) {}

  async execute(id: string, organizationId: string) {
    const member = await this.memberRepository.findById(id, organizationId);

    if (!member) {
      throw new NotFoundException('Membro não encontrado');
    }

    return member;
  }
}
