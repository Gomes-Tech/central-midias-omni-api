import { NotFoundException } from '@common/filters';
import { Inject, Injectable } from '@nestjs/common';
import { CategoryRepository } from '../repository';

@Injectable()
export class FindCategoryBySlugUseCase {
  constructor(
    @Inject('CategoryRepository')
    private readonly categoryRepository: CategoryRepository,
  ) {}

  async execute(slug: string, organizationId: string) {
    const category = await this.categoryRepository.findBySlug(
      slug,
      organizationId,
    );

    if (!category) {
      throw new NotFoundException('Categoria não encontrada');
    }

    return category;
  }
}
