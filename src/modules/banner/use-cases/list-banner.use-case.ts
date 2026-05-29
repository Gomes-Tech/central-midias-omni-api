import { CacheService } from '@infrastructure/cache';
import { StorageService } from '@infrastructure/providers';
import { Inject, Injectable } from '@nestjs/common';
import { Banner } from '../entities';
import { BannerRepository } from '../repository';

@Injectable()
export class FindListBannersUseCase {
  constructor(
    @Inject('BannerRepository')
    private readonly bannerRepository: BannerRepository,
    private readonly storageService: StorageService,
    private readonly cacheService: CacheService,
  ) {}

  async execute(
    organizationId: string,
  ): Promise<Omit<Banner, 'mobileImageKey' | 'desktopImageKey'>[]> {
    const cachedBanners = await this.cacheService.get<
      Omit<Banner, 'mobileImageKey' | 'desktopImageKey'>[]
    >(`banners:${organizationId}`);

    if (cachedBanners) {
      return cachedBanners;
    }

    const banners = await this.bannerRepository.findList(organizationId);

    const bannersWithImages = await Promise.all(
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
      `banners:${organizationId}`,
      bannersWithImages,
      60 * 15, // 5 minutes
    );

    return bannersWithImages;
  }
}
