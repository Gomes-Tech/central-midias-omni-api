import { NotFoundException } from '@common/filters';
import { StorageService } from '@infrastructure/providers';
import { Inject, Injectable } from '@nestjs/common';
import { UpsertFaqDetailDTO } from '../dto';
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
  ): Promise<void> {
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
  }
}
