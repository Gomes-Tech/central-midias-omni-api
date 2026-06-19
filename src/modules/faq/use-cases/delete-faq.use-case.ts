import { NotFoundException } from '@common/filters';
import { Inject, Injectable } from '@nestjs/common';
import { FaqRepository } from '../repository/faq.repository';

@Injectable()
export class DeleteFaqUseCase {
  constructor(
    @Inject('FaqRepository')
    private readonly faqRepository: FaqRepository,
  ) {}

  async execute(id: string, organizationId: string, userId: string) {
    const exists = await this.faqRepository.existsById(organizationId);

    if (!exists) {
      throw new NotFoundException('FAQ não encontrado');
    }

    await this.faqRepository.softDelete(id, organizationId, userId);
  }
}
