import { Injectable } from '@nestjs/common';
import { FindAllMembersFiltersDTO } from '../dto';
import { MemberRepository } from '../repository';

@Injectable()
export class FindAllMembersUseCase {
  constructor(private readonly memberRepository: MemberRepository) {}

  async execute(
    organizationId: string,
    filters: FindAllMembersFiltersDTO = {},
  ) {
    return this.memberRepository.findAll(organizationId, filters);
  }
}
