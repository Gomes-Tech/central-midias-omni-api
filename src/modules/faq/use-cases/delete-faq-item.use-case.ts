import { NotFoundException } from '@common/filters';
import { Inject, Injectable } from '@nestjs/common';
import { FaqRepository } from '../repository/faq.repository';

@Injectable()
export class DeleteFaqItemUseCase {
  constructor(
    @Inject('FaqRepository')
    private readonly faqRepository: FaqRepository,
  ) {}

  async execute(itemId: string, organizationId: string, userId: string) {
    const item = await this.faqRepository.findItemByIdOnly(
      itemId,
      organizationId,
    );

    if (!item) {
      throw new NotFoundException('Item do FAQ não encontrado');
    }

    await this.faqRepository.softDeleteItem(itemId, organizationId, userId);
  }
}
