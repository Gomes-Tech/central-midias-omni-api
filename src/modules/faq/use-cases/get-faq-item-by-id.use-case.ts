import { NotFoundException } from '@common/filters';
import { Inject, Injectable } from '@nestjs/common';
import { FaqItemDetail } from '../entities';
import { FaqRepository } from '../repository/faq.repository';

@Injectable()
export class GetFaqItemByIdUseCase {
  constructor(
    @Inject('FaqRepository')
    private readonly faqRepository: FaqRepository,
  ) {}

  async execute(
    itemId: string,
    organizationId: string,
  ): Promise<FaqItemDetail> {
    const item = await this.faqRepository.findItemByIdOnly(
      itemId,
      organizationId,
    );

    if (!item) {
      throw new NotFoundException('Item do FAQ não encontrado');
    }

    return item;
  }
}
