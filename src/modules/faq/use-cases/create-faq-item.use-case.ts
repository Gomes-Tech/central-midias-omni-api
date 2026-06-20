import { BadRequestException, NotFoundException } from '@common/filters';
import { Inject, Injectable } from '@nestjs/common';
import { CreateFaqItemDTO } from '../dto';
import { FaqRepository } from '../repository/faq.repository';

@Injectable()
export class CreateFaqItemUseCase {
  constructor(
    @Inject('FaqRepository')
    private readonly faqRepository: FaqRepository,
  ) {}

  async execute(
    organizationId: string,
    data: CreateFaqItemDTO,
    userId: string,
  ) {
    const exists = await this.faqRepository.existsById(organizationId);

    if (!exists) {
      throw new NotFoundException('FAQ não encontrado');
    }

    const existingOrder = await this.faqRepository.findItemByOrder(
      data.order,
      organizationId,
      exists.id,
    );

    if (existingOrder) {
      throw new BadRequestException('Já existe um FAQ com esta ordem');
    }

    return await this.faqRepository.createItem(
      exists.id,
      organizationId,
      data,
      userId,
    );
  }
}
