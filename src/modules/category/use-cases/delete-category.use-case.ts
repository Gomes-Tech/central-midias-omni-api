import { BadRequestException } from '@common/filters';
import { Injectable } from '@nestjs/common';
import { CategoryRepository } from '../repository';
import { FindCategoryByIdUseCase } from './find-category-by-id.use-case';

@Injectable()
export class DeleteCategoryUseCase {
  constructor(
    private readonly categoryRepository: CategoryRepository,
    private readonly findCategoryByIdUseCase: FindCategoryByIdUseCase,
  ) {}

  async execute(id: string, organizationId: string, userId: string): Promise<void> {
    await this.findCategoryByIdUseCase.execute(id, organizationId);

    const childrenCount = await this.categoryRepository.countChildren(
      id,
      organizationId,
    );

    if (childrenCount > 0) {
      throw new BadRequestException(
        'Não é possível remover uma categoria com subcategorias vinculadas',
      );
    }

    await this.categoryRepository.delete(id, organizationId, userId);
  }
}
