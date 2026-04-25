import { Inject, Injectable } from '@nestjs/common';
import { OrganizationRepository } from '../repositories';

@Injectable()
export class FindAllSelectOrganizationsUseCase {
  constructor(
    @Inject('OrganizationRepository')
    private readonly organizationRepository: OrganizationRepository,
  ) {}

  async execute(): Promise<{ id: string; name: string }[]> {
    return this.organizationRepository.findAllSelect();
  }
}
