import { Inject, Injectable } from '@nestjs/common';
import { FindAllCategoriesFiltersDTO } from '../dto';
import { CategoryRepository } from '../repository';

@Injectable()
export class FindCategoryTreeUseCase {
  constructor(
    @Inject('CategoryRepository')
    private readonly categoryRepository: CategoryRepository,
  ) {}

  async execute(
    organizationId: string,
    userId: string,
    filters: FindAllCategoriesFiltersDTO = {},
  ) {
    return await this.categoryRepository.findTree(
      organizationId,
      userId,
      filters,
    );
  }
}
