import { BadRequestException, NotFoundException } from '@common/filters';
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

    if (typeof data.order === 'number' && data.order !== item.order) {
      const existingOrder = await this.faqRepository.findItemByOrder(
        data.order,
        organizationId,
        item.faqId,
        itemId,
      );

      if (existingOrder) {
        throw new BadRequestException('Já existe um FAQ com esta ordem');
      }
    }

    await this.faqRepository.updateItem(itemId, organizationId, data, userId);
  }
}
