import { BadRequestException } from '@common/filters';
import { StorageService } from '@infrastructure/providers';
import { Inject, Injectable } from '@nestjs/common';
import { UpdateBannerDTO } from '../dto/update-banner.dto';
import { BannerRepository } from '../repository/banner.repository';
import { GetBannerUseCase } from './get-banner-by-id.use-case';

@Injectable()
export class UpdateBannerUseCase {
  constructor(
    @Inject('BannerRepository')
    private readonly bannerRepository: BannerRepository,
    private readonly getBannerUseCase: GetBannerUseCase,
    private readonly storageService: StorageService,
  ) {}

  private toStoragePath(publicUrl: string): string {
    return publicUrl.startsWith('/storage/')
      ? publicUrl.replace('/storage/', '')
      : publicUrl;
  }

  async execute(
    id: string,
    organizationId: string,
    data: UpdateBannerDTO,
    userId: string,
    files: {
      desktopImage: Express.Multer.File;
      mobileImage: Express.Multer.File;
    },
  ) {
    const banner = await this.getBannerUseCase.execute(id, organizationId);

    const mobileImage = files?.mobileImage;
    const desktopImage = files?.desktopImage;

    if (
      data.initialDate &&
      data.finishDate &&
      data.initialDate > data.finishDate
    ) {
      throw new BadRequestException(
        'A data inicial não pode ser maior que a data final',
      );
    }

    const nextInitialDate = data.initialDate ?? banner.initialDate ?? undefined;
    const nextFinishDate = data.finishDate ?? banner.finishDate ?? undefined;

    if (nextInitialDate && nextFinishDate && nextInitialDate > nextFinishDate) {
      throw new BadRequestException(
        'A data inicial não pode ser maior que a data final',
      );
    }

    const updatePayload: UpdateBannerDTO & {
      mobileImageKey?: string;
      desktopImageKey?: string;
    } = { ...data };

    const uploadedKeys: string[] = [];
    const keysToReplace: string[] = [];

    if (mobileImage) {
      const uploaded = await this.storageService.uploadFile(
        mobileImage,
        'banners',
      );
      updatePayload.mobileImageKey = uploaded.path;
      uploadedKeys.push(uploaded.path);
      keysToReplace.push(this.toStoragePath(banner.mobileImageKey));
    }

    if (desktopImage) {
      const uploaded = await this.storageService.uploadFile(
        desktopImage,
        'banners',
      );
      updatePayload.desktopImageKey = uploaded.path;
      uploadedKeys.push(uploaded.path);
      keysToReplace.push(this.toStoragePath(banner.desktopImageKey));
    }

    try {
      await this.bannerRepository.update(
        id,
        organizationId,
        updatePayload,
        userId,
      );
    } catch (error) {
      if (uploadedKeys.length > 0) {
        await this.storageService
          .deleteFile(uploadedKeys)
          .catch(() => undefined);
      }
      throw error;
    }

    if (keysToReplace.length > 0) {
      await this.storageService
        .deleteFile(keysToReplace)
        .catch(() => undefined);
    }
  }
}
