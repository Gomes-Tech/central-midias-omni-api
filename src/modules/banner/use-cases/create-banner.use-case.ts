import { BadRequestException } from '@common/filters';
import { StorageService } from '@infrastructure/providers';
import { Inject, Injectable } from '@nestjs/common';
import { CreateBannerDTO } from '../dto/create-banner.dto';
import { BannerRepository } from '../repository/banner.repository';

@Injectable()
export class CreateBannerUseCase {
  constructor(
    @Inject('BannerRepository')
    private readonly bannerRepository: BannerRepository,
    private readonly storageService: StorageService,
  ) {}

  async execute(
    organizationId: string,
    data: CreateBannerDTO,
    userId: string,
    files: { desktop: Express.Multer.File; mobile: Express.Multer.File },
  ) {
    if (
      data.initialDate &&
      data.finishDate &&
      data.initialDate > data.finishDate
    ) {
      throw new BadRequestException(
        'A data inicial não pode ser maior que a data final',
      );
    }

    if (!files.mobile || !files.desktop) {
      throw new BadRequestException(
        'Os arquivos mobileImage e desktopImage são obrigatórios',
      );
    }

    const [mobileUpload, desktopUpload] = await Promise.all([
      this.storageService.uploadFile(files.mobile, 'banners/mobile'),
      this.storageService.uploadFile(files.desktop, 'banners'),
    ]);

    await this.bannerRepository.create(
      organizationId,
      {
        ...data,
        mobileImageKey: mobileUpload.publicUrl,
        desktopImageKey: desktopUpload.publicUrl,
      },
      userId,
    );
  }
}
