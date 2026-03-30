import { StorageService } from '@infrastructure/providers';
import { Injectable } from '@nestjs/common';
import { BannerRepository } from '../repository/banner.repository';
import { GetBannerUseCase } from './get-banner.use-case';

@Injectable()
export class DeleteBannerUseCase {
  constructor(
    private readonly bannerRepository: BannerRepository,
    private readonly getBannerUseCase: GetBannerUseCase,
    private readonly storageService: StorageService,
  ) {}

  private toStoragePath(publicUrl: string): string {
    return publicUrl.startsWith('/storage/')
      ? publicUrl.replace('/storage/', '')
      : publicUrl;
  }

  async execute(id: string, organizationId: string, userId: string) {
    const banner = await this.getBannerUseCase.execute(id, organizationId);

    await this.bannerRepository.softDelete(id, organizationId, userId);

    await this.storageService.deleteFile([
      this.toStoragePath(banner.mobileImageUrl),
      this.toStoragePath(banner.desktopImageUrl),
    ]);
  }
}
