import { Inject, Injectable } from '@nestjs/common';
import { CategoryRepository } from '../repository';

@Injectable()
export class FindCategoryTreeBySlugPathUseCase {
  constructor(
    @Inject('CategoryRepository')
    private readonly categoryRepository: CategoryRepository,
  ) {}

  async execute(slugPath: string, organizationId: string, userId: string) {
    return await this.categoryRepository.findTreeBySlugPath(
      slugPath,
      organizationId,
      userId,
    );
  }
}
