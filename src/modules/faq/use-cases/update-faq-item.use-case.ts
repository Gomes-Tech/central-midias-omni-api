import { NotFoundException } from '@common/filters';
import { Inject, Injectable } from '@nestjs/common';
import { UpdateFaqItemDTO } from '../dto';
import { FaqRepository } from '../repository/faq.repository';

@Injectable()
export class UpdateFaqItemUseCase {
  constructor(
    @Inject('FaqRepository')
    private readonly faqRepository: FaqRepository,
  ) {}

  async execute(
    itemId: string,
    organizationId: string,
    data: UpdateFaqItemDTO,
    userId: string,
  ) {
    const item = await this.faqRepository.findItemByIdOnly(
      itemId,
      organizationId,
    );

    if (!item) {
      throw new NotFoundException('Item do FAQ não encontrado');
    }

    await this.faqRepository.updateItem(itemId, organizationId, data, userId);
  }
}
