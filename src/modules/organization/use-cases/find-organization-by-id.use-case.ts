import { NotFoundException } from '@common/filters';
import { Inject, Injectable } from '@nestjs/common';
import { OrganizationRepository } from '../repositories';

@Injectable()
export class FindOrganizationByIdUseCase {
  constructor(
    @Inject('OrganizationRepository')
    private readonly organizationRepository: OrganizationRepository,
  ) {}

  async execute(id: string) {
    const organization = await this.organizationRepository.findById(id);

    if (!organization) {
      throw new NotFoundException('Organização não encontrada');
    }

    return organization;
  }
}
