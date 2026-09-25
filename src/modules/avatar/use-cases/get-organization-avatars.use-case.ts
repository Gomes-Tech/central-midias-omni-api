import {
  S3_MAX_SIGNED_URL_EXPIRES_IN,
  StorageService,
} from '@infrastructure/providers';
import { FindMemberRoleUseCase } from '@modules/member/use-cases';
import { Inject, Injectable } from '@nestjs/common';
import { OrganizationAvatars } from '../entities';
import { AvatarRepository } from '../repository';

@Injectable()
export class GetOrganizationAvatarsUseCase {
  constructor(
    @Inject('AvatarRepository')
    private readonly avatarRepository: AvatarRepository,
    private readonly findMemberRoleUseCase: FindMemberRoleUseCase,
    private readonly storageService: StorageService,
  ) {}

  async execute(
    organizationId: string,
    userId: string,
  ): Promise<OrganizationAvatars> {
    await this.findMemberRoleUseCase.execute(organizationId, userId);

    const { standardAvatarKey, customizableAvatarKey } =
      await this.avatarRepository.findAvatarKeys(organizationId);

    const [standardAvatarUrl, customizableAvatarUrl] = await Promise.all([
      this.resolveUrl(standardAvatarKey),
      this.resolveUrl(customizableAvatarKey),
    ]);

    return {
      standardAvatarUrl,
      customizableAvatarUrl,
    };
  }

  private async resolveUrl(fileKey: string | null): Promise<string | null> {
    if (!fileKey) {
      return null;
    }

    return this.storageService
      .getPublicUrl(fileKey, S3_MAX_SIGNED_URL_EXPIRES_IN)
      .catch(() => null);
  }
}
