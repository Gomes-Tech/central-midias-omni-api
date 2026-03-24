import { Inject, Injectable } from '@nestjs/common';
import { OrganizationRepository } from '../repositories';
import { FindOrganizationByIdUseCase } from './find-organization-by-id.use-case';

@Injectable()
export class DeleteOrganizationUseCase {
  constructor(
    @Inject('OrganizationRepository')
    private readonly organizationRepository: OrganizationRepository,
    private readonly findOrganizationByIdUseCase: FindOrganizationByIdUseCase,
  ) {}

  async execute(id: string) {
    await this.findOrganizationByIdUseCase.execute(id);
    return this.organizationRepository.delete(id);
  }
}
