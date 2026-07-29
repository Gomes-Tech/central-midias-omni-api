import { Injectable } from '@nestjs/common';
import { MemberManagerSelect } from '../entities';
import { MemberRepository } from '../repository';

@Injectable()
export class FindManagersSelectUseCase {
  constructor(private readonly memberRepository: MemberRepository) {}

  async execute(
    organizationId: string,
    excludeUserId?: string,
  ): Promise<MemberManagerSelect[]> {
    return this.memberRepository.findManagersSelect(
      organizationId,
      excludeUserId,
    );
  }
}
