import { Inject, Injectable } from '@nestjs/common';
import { FindAllCategoriesFiltersDTO } from '../dto';
import { CategoryRepository } from '../repository';

@Injectable()
export class FindAllCategoriesUseCase {
  constructor(
    @Inject('CategoryRepository')
    private readonly categoryRepository: CategoryRepository,
  ) {}

  async execute(
    organizationId: string,
    filters: FindAllCategoriesFiltersDTO = {},
  ) {
    return await this.categoryRepository.findAll(organizationId, filters);
  }
}
