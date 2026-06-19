import { Inject, Injectable } from '@nestjs/common';
import { PaginatedResponse } from '../../../types';
import { FindAllFaqItemsFiltersDTO } from '../dto';
import { FaqItemEntity } from '../entities';
import { FaqRepository } from '../repository/faq.repository';

@Injectable()
export class FindAllFaqItemsUseCase {
  constructor(
    @Inject('FaqRepository')
    private readonly faqRepository: FaqRepository,
  ) {}

  async execute(
    organizationId: string,
    filters: FindAllFaqItemsFiltersDTO = {},
  ): Promise<PaginatedResponse<FaqItemEntity>> {
    return await this.faqRepository.findAllItems(filters, organizationId);
  }
}
