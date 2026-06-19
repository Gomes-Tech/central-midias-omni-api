import { NotFoundException } from '@common/filters';
import { Inject, Injectable } from '@nestjs/common';
import { UpdateFaqDTO } from '../dto';
import { FaqRepository } from '../repository/faq.repository';

@Injectable()
export class UpdateFaqUseCase {
  constructor(
    @Inject('FaqRepository')
    private readonly faqRepository: FaqRepository,
  ) {}

  async execute(
    id: string,
    organizationId: string,
    data: UpdateFaqDTO,
    userId: string,
  ) {
    const exists = await this.faqRepository.existsById(id, organizationId);

    if (!exists) {
      throw new NotFoundException('FAQ não encontrado');
    }

    await this.faqRepository.update(id, organizationId, data, userId);
  }
}
