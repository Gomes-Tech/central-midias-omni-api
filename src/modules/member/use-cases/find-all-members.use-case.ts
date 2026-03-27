import { Injectable } from '@nestjs/common';
import { FindAllMembersFiltersDTO } from '../dto';
import { MemberRepository } from '../repository';

@Injectable()
export class FindAllMembersUseCase {
  constructor(private readonly memberRepository: MemberRepository) {}

  async execute(
    organizationId: string,
    filters: FindAllMembersFiltersDTO = {},
  ): Promise<{
    data: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    return this.memberRepository.findAll(organizationId, filters);
  }
}
