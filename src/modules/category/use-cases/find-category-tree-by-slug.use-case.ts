import { Inject, Injectable } from '@nestjs/common';
import { CategoryRepository } from '../repository';

@Injectable()
export class FindCategoryTreeBySlugUseCase {
  constructor(
    @Inject('CategoryRepository')
    private readonly categoryRepository: CategoryRepository,
  ) {}

  async execute(slug: string, organizationId: string, userId: string) {
    return await this.categoryRepository.findTreeBySlug(
      slug,
      organizationId,
      userId,
    );
  }
}
