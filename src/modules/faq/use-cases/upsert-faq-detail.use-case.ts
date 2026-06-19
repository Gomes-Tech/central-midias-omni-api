import { NotFoundException } from '@common/filters';
import { StorageService } from '@infrastructure/providers';
import { Inject, Injectable } from '@nestjs/common';
import { UpsertFaqDetailDTO } from '../dto';
import { FaqDetailEntity } from '../entities';
import { FaqRepository } from '../repository/faq.repository';

@Injectable()
export class UpsertFaqDetailUseCase {
  constructor(
    @Inject('FaqRepository')
    private readonly faqRepository: FaqRepository,
    private readonly storageService: StorageService,
  ) {}

  async execute(
    faqId: string,
    organizationId: string,
    data: UpsertFaqDetailDTO,
    userId: string,
    file?: Express.Multer.File,
  ): Promise<FaqDetailEntity> {
    const exists = await this.faqRepository.existsById(organizationId);

    if (!exists) {
      throw new NotFoundException('FAQ não encontrado');
    }

    let imageKey: string | undefined;

    if (file) {
      const upload = await this.storageService.uploadFile(file, 'faqs');
      imageKey = upload.path;
    }

    await this.faqRepository.upsertDetail(
      faqId,
      {
        ...data,
        ...(imageKey !== undefined && { imageKey }),
      },
      userId,
    );

    const detail = await this.faqRepository.findDetailByFaqId(faqId);

    if (!detail) {
      throw new NotFoundException('Detalhes do FAQ não encontrados');
    }

    let imageUrl: string | null = null;

    if (detail.imageKey) {
      imageUrl = await this.storageService.getPublicUrl(detail.imageKey);
    }

    return {
      id: detail.id,
      description: detail.description,
      imageUrl,
      phonePrimary: detail.phonePrimary,
      phonePrimaryLabel: detail.phonePrimaryLabel,
      phonePrimaryIsWhatsapp: detail.phonePrimaryIsWhatsapp,
      phoneSecondary: detail.phoneSecondary,
      phoneSecondaryLabel: detail.phoneSecondaryLabel,
      phoneSecondaryIsWhatsapp: detail.phoneSecondaryIsWhatsapp,
    };
  }
}
