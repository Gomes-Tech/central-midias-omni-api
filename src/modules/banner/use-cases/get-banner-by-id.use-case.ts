import { NotFoundException } from '@common/filters';
import { StorageService } from '@infrastructure/providers';
import { Inject, Injectable } from '@nestjs/common';
import { Banner } from '../entities';
import { BannerRepository } from '../repository/banner.repository';

@Injectable()
export class GetBannerUseCase {
  constructor(
    @Inject('BannerRepository')
    private readonly bannerRepository: BannerRepository,

    private readonly storageService: StorageService,
  ) {}

  async execute(id: string, organizationId: string): Promise<Banner> {
    const banner = await this.bannerRepository.findById(id, organizationId);

    if (!banner) {
      throw new NotFoundException('Banner não encontrado');
    }

    let mobileImageUrl: string | null = null;
    if (banner.mobileImageKey) {
      mobileImageUrl = await this.storageService.getPublicUrl(
        banner.mobileImageKey,
      );
    }

    let desktopImageUrl: string | null = null;
    if (banner.desktopImageKey) {
      desktopImageUrl = await this.storageService.getPublicUrl(
        banner.desktopImageKey,
      );
    }

    return {
      ...banner,
      mobileImageUrl,
      desktopImageUrl,
    };
  }
}
