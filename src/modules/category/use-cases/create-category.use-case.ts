import { BadRequestException } from '@common/filters';
import { buildSlugPath, toSlug } from '@common/utils';
import { SyncCategoryGlobalRolesUseCase } from '@modules/category-role-access/use-cases/sync-category-global-roles.use-case';
import { Inject, Injectable } from '@nestjs/common';
import { CreateCategoryDTO } from '../dto';
import { CategoryRepository } from '../repository';
import { FindCategoryByIdUseCase } from './find-category-by-id.use-case';

@Injectable()
export class CreateCategoryUseCase {
  constructor(
    @Inject('CategoryRepository')
    private readonly categoryRepository: CategoryRepository,
    private readonly findCategoryByIdUseCase: FindCategoryByIdUseCase,
    private readonly syncCategoryGlobalRolesUseCase: SyncCategoryGlobalRolesUseCase,
  ) {}

  async execute(
    organizationId: string,
    data: CreateCategoryDTO,
    userId: string,
  ): Promise<void> {
    const slug = toSlug(data.name);
    const parentId = data.parentId ?? null;

    const existingSibling = await this.categoryRepository.findSiblingBySlug(
      slug,
      organizationId,
      parentId,
    );

    if (existingSibling) {
      throw new BadRequestException(
        'Já existe uma categoria com este slug neste nível',
      );
    }

    const existingOrder = await this.categoryRepository.findSiblingByOrder(
      data.order,
      organizationId,
      parentId,
    );

    if (existingOrder) {
      throw new BadRequestException(
        'Já existe uma categoria com esta ordem neste nível',
      );
    }

    let parentSlugPath: string | null = null;

    if (data.parentId) {
      const parentCategory = await this.findCategoryByIdUseCase.execute(
        data.parentId,
        organizationId,
      );

      if (!parentCategory.isActive) {
        throw new BadRequestException('Categoria pai está inativa');
      }

      parentSlugPath = parentCategory.slugPath;
    }

    const slugPath = buildSlugPath(parentSlugPath, slug);

    const category = await this.categoryRepository.create(
      organizationId,
      { slug, slugPath, ...data },
      userId,
    );

    await this.syncCategoryGlobalRolesUseCase.execute(
      category.id,
      organizationId,
    );
  }
}
