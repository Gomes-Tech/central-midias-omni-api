import { Injectable } from '@nestjs/common';
import { CategoryRepository } from '../repository';
import { FindCategoryByIdUseCase } from './find-category-by-id.use-case';

@Injectable()
export class DeleteCategoryUseCase {
  constructor(
    private readonly categoryRepository: CategoryRepository,
    private readonly findCategoryByIdUseCase: FindCategoryByIdUseCase,
  ) {}

  async execute(
    id: string,
    organizationId: string,
    userId: string,
  ): Promise<void> {
    await this.findCategoryByIdUseCase.execute(id, organizationId);

    await this.categoryRepository.delete(id, organizationId, userId);
  }
}
