import { NotFoundException } from '@common/filters';
import { StorageService } from '@infrastructure/providers';
import { Inject, Injectable } from '@nestjs/common';
import { OrganizationEntity } from '../entities';
import { OrganizationRepository } from '../repositories';

@Injectable()
export class FindOrganizationByIdUseCase {
  constructor(
    @Inject('OrganizationRepository')
    private readonly organizationRepository: OrganizationRepository,
    private readonly storageService: StorageService,
  ) {}

  async execute(
    id: string,
  ): Promise<Omit<OrganizationEntity, 'avatarKey'> & { avatarUrl: string }> {
    const organization = await this.organizationRepository.findById(id);

    if (!organization) {
      throw new NotFoundException('Organização não encontrada');
    }

    let avatarUrl: string | null = null;

    if (organization.avatarKey) {
      avatarUrl = await this.storageService.getPublicUrl(
        organization.avatarKey,
      );
    }

    delete organization.avatarKey;

    return {
      ...organization,
      avatarUrl,
    };
  }
}
