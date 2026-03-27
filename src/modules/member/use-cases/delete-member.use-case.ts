import { Injectable } from '@nestjs/common';
import { MemberRepository } from '../repository';
import { FindMemberByIdUseCase } from './find-member-by-id.use-case';

@Injectable()
export class DeleteMemberUseCase {
  constructor(
    private readonly memberRepository: MemberRepository,
    private readonly findMemberByIdUseCase: FindMemberByIdUseCase,
  ) {}

  async execute(id: string, organizationId: string) {
    await this.findMemberByIdUseCase.execute(id, organizationId);

    await this.memberRepository.delete(id, organizationId);
  }
}
