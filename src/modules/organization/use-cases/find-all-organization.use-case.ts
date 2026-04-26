import { StorageService } from '@infrastructure/providers';
import { Inject, Injectable } from '@nestjs/common';
import { FindAllFilters, PaginatedResponse } from '../../../types';
import { OrganizationList } from '../entities';
import { OrganizationRepository } from '../repositories';

@Injectable()
export class FindAllOrganizationsUseCase {
  constructor(
    @Inject('OrganizationRepository')
    private readonly organizationRepository: OrganizationRepository,
    private readonly storageService: StorageService,
  ) {}

  async execute(
    filters: FindAllFilters = {},
  ): Promise<PaginatedResponse<OrganizationList>> {
    const organizations = await this.organizationRepository.findAll(filters);

    const organizationsWithAvatarUrl = await Promise.all(
      organizations.data.map(async (organization) => {
        let avatarUrl: string | null = null;

        if (organization.avatarKey) {
          avatarUrl = await this.storageService.getPublicUrl(
            organization.avatarKey,
          );
        }

        return {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          isActive: organization.isActive,
          createdAt: organization.createdAt,
          avatarUrl,
        };
      }),
    );

    return {
      data: organizationsWithAvatarUrl,
      total: organizations.total,
      totalPages: organizations.totalPages,
      page: organizations.page,
    };
  }
}
