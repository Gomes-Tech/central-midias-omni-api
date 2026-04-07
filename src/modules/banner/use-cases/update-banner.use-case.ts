import { BadRequestException } from '@common/filters';
import { StorageService } from '@infrastructure/providers';
import { Inject, Injectable } from '@nestjs/common';
import { UpdateBannerDTO } from '../dto/update-banner.dto';
import { BannerRepository } from '../repository/banner.repository';
import { GetBannerUseCase } from './get-banner.use-case';

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
    files?: {
      mobileImage?: Express.Multer.File[];
      desktopImage?: Express.Multer.File[];
    },
  ) {
    const banner = await this.getBannerUseCase.execute(id, organizationId);

    const mobileImage = files?.mobileImage?.[0];
    const desktopImage = files?.desktopImage?.[0];

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

    if (mobileImage) {
      const uploaded = await this.storageService.uploadFile(
        mobileImage,
        'banners',
      );
      updatePayload.mobileImageKey = uploaded.publicUrl;
      await this.storageService.deleteFile([
        this.toStoragePath(banner.mobileImageKey),
      ]);
    }

    if (desktopImage) {
      const uploaded = await this.storageService.uploadFile(
        desktopImage,
        'banners',
      );
      updatePayload.desktopImageKey = uploaded.publicUrl;
      await this.storageService.deleteFile([
        this.toStoragePath(banner.desktopImageKey),
      ]);
    }

    await this.bannerRepository.update(
      id,
      organizationId,
      updatePayload,
      userId,
    );
  }
}
