import { Inject, Injectable } from '@nestjs/common';
import { OrganizationEntity } from '../entities';
import { OrganizationRepository } from '../repositories';

@Injectable()
export class FindAllOrganizationsUseCase {
  constructor(
    @Inject('OrganizationRepository')
    private readonly organizationRepository: OrganizationRepository,
  ) {}

  async execute(): Promise<OrganizationEntity[]> {
    return this.organizationRepository.findAll();
  }
}
