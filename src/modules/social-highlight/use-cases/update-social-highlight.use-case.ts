import { BadRequestException } from '@common/filters';
import { StorageService } from '@infrastructure/providers';
import { Inject, Injectable } from '@nestjs/common';
import { UpdateSocialHighlightDTO } from '../dto/update-social-highlight.dto';
import { SocialHighlightRepository } from '../repository/social-highlight.repository';
import { GetSocialHighlightUseCase } from './get-social-highlight-by-id.use-case';

@Injectable()
export class UpdateSocialHighlightUseCase {
  constructor(
    @Inject('SocialHighlightRepository')
    private readonly socialHighlightRepository: SocialHighlightRepository,
    private readonly getSocialHighlightUseCase: GetSocialHighlightUseCase,
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
    data: UpdateSocialHighlightDTO,
    userId: string,
    files: {
      desktopImage: Express.Multer.File;
      mobileImage: Express.Multer.File;
    },
  ) {
    const banner = await this.getSocialHighlightUseCase.execute(id, organizationId);

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

    const updatePayload: UpdateSocialHighlightDTO & {
      mobileImageKey?: string;
      desktopImageKey?: string;
    } = { ...data };

    if (mobileImage) {
      const uploaded = await this.storageService.uploadFile(
        mobileImage,
        'social-highlights',
      );
      updatePayload.mobileImageKey = uploaded.path;
      await this.storageService.deleteFile([
        this.toStoragePath(banner.mobileImageKey),
      ]);
    }

    if (desktopImage) {
      const uploaded = await this.storageService.uploadFile(
        desktopImage,
        'social-highlights',
      );
      updatePayload.desktopImageKey = uploaded.path;
      await this.storageService.deleteFile([
        this.toStoragePath(banner.desktopImageKey),
      ]);
    }

    await this.socialHighlightRepository.update(
      id,
      organizationId,
      updatePayload,
      userId,
    );
  }
}
