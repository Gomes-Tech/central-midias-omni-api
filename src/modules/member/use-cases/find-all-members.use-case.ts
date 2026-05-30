import { Injectable } from '@nestjs/common';
import { PaginatedResponse } from '../../../types';
import { FindAllMembersFiltersDTO } from '../dto';
import { MemberList } from '../entities';
import { MemberRepository } from '../repository';

@Injectable()
export class FindAllMembersUseCase {
  constructor(private readonly memberRepository: MemberRepository) {}

  async execute(
    organizationId: string,
    filters: FindAllMembersFiltersDTO = {},
  ): Promise<PaginatedResponse<MemberList>> {
    return this.memberRepository.findAll(organizationId, filters);
  }
}
