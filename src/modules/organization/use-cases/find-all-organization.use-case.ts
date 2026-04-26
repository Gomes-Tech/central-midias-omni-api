import { Inject, Injectable } from '@nestjs/common';
import { FindAllFilters, PaginatedResponse } from '../../../types';
import { OrganizationList } from '../entities';
import { OrganizationRepository } from '../repositories';

@Injectable()
export class FindAllOrganizationsUseCase {
  constructor(
    @Inject('OrganizationRepository')
    private readonly organizationRepository: OrganizationRepository,
  ) {}

  async execute(
    filters: FindAllFilters = {},
  ): Promise<PaginatedResponse<OrganizationList>> {
    return this.organizationRepository.findAll(filters);
  }
}
