import { CacheService } from '@infrastructure/cache';
import { StorageService } from '@infrastructure/providers';
import { Inject, Injectable } from '@nestjs/common';
import { SocialHighlight } from '../entities';
import { SocialHighlightRepository } from '../repository';

@Injectable()
export class FindListSocialHighlightsUseCase {
  constructor(
    @Inject('SocialHighlightRepository')
    private readonly socialHighlightRepository: SocialHighlightRepository,
    private readonly storageService: StorageService,
    private readonly cacheService: CacheService,
  ) {}

  async execute(
    organizationId: string,
  ): Promise<Omit<SocialHighlight, 'mobileImageKey' | 'desktopImageKey'>[]> {
    const cachedSocialHighlights = await this.cacheService.get<
      Omit<SocialHighlight, 'mobileImageKey' | 'desktopImageKey'>[]
    >(`social-highlights:${organizationId}`);

    if (cachedSocialHighlights) {
      return cachedSocialHighlights;
    }

    const banners = await this.socialHighlightRepository.findList(organizationId);

    const socialHighlightsWithImages = await Promise.all(
      banners.map(async ({ mobileImageKey, desktopImageKey, ...banner }) => ({
        ...banner,
        mobileImageUrl: mobileImageKey
          ? await this.storageService
              .getPublicUrl(mobileImageKey)
              .catch(() => null)
          : null,
        desktopImageUrl: desktopImageKey
          ? await this.storageService
              .getPublicUrl(desktopImageKey)
              .catch(() => null)
          : null,
      })),
    );

    await this.cacheService.set(
      `social-highlights:${organizationId}`,
      socialHighlightsWithImages,
      60 * 15, // 5 minutes
    );

    return socialHighlightsWithImages;
  }
}
