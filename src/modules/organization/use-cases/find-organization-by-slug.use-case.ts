import { NotFoundException } from '@common/filters';
import { Inject, Injectable } from '@nestjs/common';
import { OrganizationRepository } from '../repositories';

@Injectable()
export class FindOrganizationBySlugUseCase {
  constructor(
    @Inject('OrganizationRepository')
    private readonly organizationRepository: OrganizationRepository,
  ) {}

  async execute(slug: string) {
    const organization = await this.organizationRepository.findBySlug(slug);

    if (!organization) {
      throw new NotFoundException('Organização não encontrada');
    }

    return organization;
  }
}
