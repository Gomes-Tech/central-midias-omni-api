import { NotFoundException } from '@common/filters';
import { StorageService } from '@infrastructure/providers';
import { Inject, Injectable } from '@nestjs/common';
import { Faq, FaqDetailEntity } from '../entities';
import { FaqRepository } from '../repository/faq.repository';

@Injectable()
export class GetFaqByIdUseCase {
  constructor(
    @Inject('FaqRepository')
    private readonly faqRepository: FaqRepository,
    private readonly storageService: StorageService,
  ) {}

  async execute(id: string, organizationId: string): Promise<Faq> {
    const faq = await this.faqRepository.findById(id, organizationId);

    if (!faq) {
      throw new NotFoundException('FAQ não encontrado');
    }

    let detail: FaqDetailEntity | null = null;

    if (faq.detail) {
      let imageUrl: string | null = null;

      if (faq.detail.imageKey) {
        imageUrl = await this.storageService.getPublicUrl(faq.detail.imageKey);
      }

      detail = {
        id: faq.detail.id,
        description: faq.detail.description,
        imageUrl,
        phonePrimary: faq.detail.phonePrimary,
        phonePrimaryLabel: faq.detail.phonePrimaryLabel,
        phonePrimaryIsWhatsapp: faq.detail.phonePrimaryIsWhatsapp,
        phoneSecondary: faq.detail.phoneSecondary,
        phoneSecondaryLabel: faq.detail.phoneSecondaryLabel,
        phoneSecondaryIsWhatsapp: faq.detail.phoneSecondaryIsWhatsapp,
      };
    }

    return {
      id: faq.id,
      name: faq.name,
      order: faq.order,
      isActive: faq.isActive,
      items: faq.items,
      detail,
    };
  }
}
