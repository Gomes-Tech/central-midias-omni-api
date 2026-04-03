import { BadRequestException } from '@common/filters';
import { Inject, Injectable } from '@nestjs/common';
import { CreateCategoryDTO } from '../dto';
import { CategoryRepository } from '../repository';
import { FindCategoryByIdUseCase } from './find-category-by-id.use-case';
import { FindCategoryBySlugUseCase } from './find-category-by-slug.use-case';

@Injectable()
export class CreateCategoryUseCase {
  constructor(
    @Inject('CategoryRepository')
    private readonly categoryRepository: CategoryRepository,
    private readonly findCategoryByIdUseCase: FindCategoryByIdUseCase,
    private readonly fincCategoryBySlugUseCase: FindCategoryBySlugUseCase,
  ) {}

  async execute(
    organizationId: string,
    data: CreateCategoryDTO,
    userId: string,
  ): Promise<void> {
    const existingSlug = await this.fincCategoryBySlugUseCase
      .execute(data.slug, organizationId)
      .catch(() => null);

    if (existingSlug) {
      throw new BadRequestException('Já existe uma categoria com este slug');
    }

    const existingOrder = await this.categoryRepository.findByOrder(
      data.order,
      organizationId,
    );

    if (existingOrder) {
      throw new BadRequestException(
        'Já existe uma categoria com esta ordem nesta organização',
      );
    }

    if (data.parentId) {
      const parentCategory = await this.findCategoryByIdUseCase.execute(
        data.parentId,
        organizationId,
      );

      if (!parentCategory.isActive) {
        throw new BadRequestException('Categoria pai está inativa');
      }
    }

    await this.categoryRepository.create(organizationId, data, userId);
  }
}
