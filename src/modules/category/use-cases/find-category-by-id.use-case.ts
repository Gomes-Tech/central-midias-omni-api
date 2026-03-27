import { NotFoundException } from '@common/filters';
import { Inject, Injectable } from '@nestjs/common';
import { CategoryRepository } from '../repository';

@Injectable()
export class FindCategoryByIdUseCase {
  constructor(
    @Inject('CategoryRepository')
    private readonly categoryRepository: CategoryRepository,
  ) {}

  async execute(id: string, organizationId: string) {
    const category = await this.categoryRepository.findById(id, organizationId);

    if (!category) {
      throw new NotFoundException('Categoria não encontrada');
    }

    return category;
  }
}
