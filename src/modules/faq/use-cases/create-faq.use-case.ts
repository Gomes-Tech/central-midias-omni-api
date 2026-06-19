import { Inject, Injectable } from '@nestjs/common';
import { CreateFaqDTO } from '../dto';
import { FaqRepository } from '../repository/faq.repository';

@Injectable()
export class CreateFaqUseCase {
  constructor(
    @Inject('FaqRepository')
    private readonly faqRepository: FaqRepository,
  ) {}

  async execute(
    organizationId: string,
    data: CreateFaqDTO,
    userId: string,
  ) {
    return await this.faqRepository.create(organizationId, data, userId);
  }
}
