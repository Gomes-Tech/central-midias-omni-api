import { StorageService } from '@infrastructure/providers';
import { Inject, Injectable } from '@nestjs/common';
import { OrganizationRepository } from '../repositories';

@Injectable()
export class FindAccessibleOrganizationsUseCase {
  constructor(
    @Inject('OrganizationRepository')
    private readonly organizationRepository: OrganizationRepository,
    private readonly storageService: StorageService,
  ) {}

  async execute(
    userId: string,
  ): Promise<{ id: string; name: string; avatarUrl?: string }[]> {
    const organizations =
      await this.organizationRepository.findAccessibleSelectForUser(userId);

    const organizationsWithAvatarUrl = await Promise.all(
      organizations.map(async (organization) => {
        let avatarUrl: string | null = null;
        if (organization.avatarKey) {
          avatarUrl = await this.storageService.getPublicUrl(
            organization.avatarKey,
          );
        }
        return {
          id: organization.id,
          name: organization.name,
          avatarUrl,
        };
      }),
    );

    return organizationsWithAvatarUrl;
  }
}
