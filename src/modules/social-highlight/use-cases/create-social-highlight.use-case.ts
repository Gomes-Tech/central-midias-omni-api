import { BadRequestException } from '@common/filters';
import { StorageService } from '@infrastructure/providers';
import { Inject, Injectable } from '@nestjs/common';
import { CreateSocialHighlightDTO } from '../dto/create-social-highlight.dto';
import { SocialHighlightRepository } from '../repository/social-highlight.repository';

@Injectable()
export class CreateSocialHighlightUseCase {
  constructor(
    @Inject('SocialHighlightRepository')
    private readonly socialHighlightRepository: SocialHighlightRepository,
    private readonly storageService: StorageService,
  ) {}

  async execute(
    organizationId: string,
    data: CreateSocialHighlightDTO,
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
      this.storageService.uploadFile(files.mobile, 'social-highlights/mobile'),
      this.storageService.uploadFile(files.desktop, 'social-highlights'),
    ]);

    await this.socialHighlightRepository.create(
      organizationId,
      {
        ...data,
        mobileImageKey: mobileUpload.path,
        desktopImageKey: desktopUpload.path,
      },
      userId,
    );
  }
}
