import { Inject, Injectable } from '@nestjs/common';
import { FindAllFaqsFiltersDTO } from '../dto';
import { FaqRepository } from '../repository/faq.repository';

@Injectable()
export class FindAllFaqsUseCase {
  constructor(
    @Inject('FaqRepository')
    private readonly faqRepository: FaqRepository,
  ) {}

  async execute(organizationId: string, filters: FindAllFaqsFiltersDTO = {}) {
    return await this.faqRepository.findAll(filters, organizationId);
  }
}
