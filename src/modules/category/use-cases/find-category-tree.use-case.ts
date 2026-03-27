import { Inject, Injectable } from '@nestjs/common';
import { CategoryRepository } from '../repository';

@Injectable()
export class FindCategoryTreeUseCase {
  constructor(
    @Inject('CategoryRepository')
    private readonly categoryRepository: CategoryRepository,
  ) {}

  async execute(organizationId: string) {
    return await this.categoryRepository.findTree(organizationId);
  }
}
