import { BadRequestException } from '@common/filters';
import { buildSlugPath } from '@common/utils';
import { Inject, Injectable } from '@nestjs/common';
import { UpdateCategoryDTO } from '../dto';
import { CategoryRepository } from '../repository';
import { FindCategoryByIdUseCase } from './find-category-by-id.use-case';

@Injectable()
export class UpdateCategoryUseCase {
  constructor(
    @Inject('CategoryRepository')
    private readonly categoryRepository: CategoryRepository,
    private readonly findCategoryByIdUseCase: FindCategoryByIdUseCase,
  ) {}

  async execute(
    id: string,
    organizationId: string,
    data: UpdateCategoryDTO,
    userId: string,
  ): Promise<void> {
    const category = await this.findCategoryByIdUseCase.execute(
      id,
      organizationId,
    );

    const effectiveParentId =
      data.parentId !== undefined ? data.parentId : category.parentId;
    const effectiveSlug = data.slug ?? category.slug;
    const externalLink =
      data.externalLink !== undefined
        ? data.externalLink?.trim() || null
        : category.externalLink?.trim() || null;
    const effectiveHasExternalLink =
      data.hasExternalLink !== undefined
        ? data.hasExternalLink
        : category.hasExternalLink || !!externalLink;
    const slugChanged = data.slug !== undefined && data.slug !== category.slug;
    const parentChanged =
      data.parentId !== undefined && data.parentId !== category.parentId;
    let parentCategory: Awaited<
      ReturnType<FindCategoryByIdUseCase['execute']>
    > | null = null;

    if (effectiveHasExternalLink && !externalLink) {
      throw new BadRequestException(
        'O link é obrigatório para uma categoria com link externo',
      );
    }

    if (effectiveHasExternalLink && effectiveParentId) {
      throw new BadRequestException(
        'Uma categoria com link externo não pode ter categoria pai. Mantenha-a no nível raiz.',
      );
    }

    if (effectiveHasExternalLink && category.children.length > 0) {
      throw new BadRequestException(
        'Uma categoria com link externo não pode ter subcategorias',
      );
    }

    if (slugChanged || parentChanged) {
      const existingSibling = await this.categoryRepository.findSiblingBySlug(
        effectiveSlug,
        organizationId,
        effectiveParentId,
        id,
      );

      if (existingSibling) {
        throw new BadRequestException(
          'Já existe uma categoria com este slug neste nível',
        );
      }
    }

    const effectiveOrder =
      typeof data.order === 'number' ? data.order : category.order;

    if (
      parentChanged ||
      (typeof data.order === 'number' && data.order !== category.order)
    ) {
      const existingOrder = await this.categoryRepository.findSiblingByOrder(
        effectiveOrder,
        organizationId,
        effectiveParentId,
        id,
      );

      if (existingOrder) {
        throw new BadRequestException(
          'Já existe uma categoria com esta ordem neste nível',
        );
      }
    }

    if (data.parentId !== undefined) {
      if (data.parentId === id) {
        throw new BadRequestException(
          'Uma categoria não pode ser pai dela mesma',
        );
      }

      if (data.parentId) {
        parentCategory = await this.findCategoryByIdUseCase.execute(
          data.parentId,
          organizationId,
        );

        if (!parentCategory.isActive) {
          throw new BadRequestException('Categoria pai está inativa');
        }

        if (parentCategory.hasExternalLink) {
          throw new BadRequestException(
            'Não é possível mover uma categoria para dentro de uma categoria com link externo',
          );
        }

        const hierarchy =
          await this.categoryRepository.findHierarchyReferences(organizationId);
        const parentMap = new Map(
          hierarchy.map((item) => [item.id, item.parentId]),
        );

        let currentParentId: string | null = data.parentId;

        while (currentParentId) {
          if (currentParentId === id) {
            throw new BadRequestException(
              'Não é possível criar um ciclo na hierarquia de categorias',
            );
          }

          currentParentId = parentMap.get(currentParentId) ?? null;
        }
      }
    }

    let slugPath: string | undefined;

    if (slugChanged || parentChanged) {
      let parentSlugPath: string | null = null;

      if (effectiveParentId) {
        parentCategory ??= await this.findCategoryByIdUseCase.execute(
          effectiveParentId,
          organizationId,
        );
        parentSlugPath = parentCategory.slugPath;
      }

      slugPath = buildSlugPath(parentSlugPath, effectiveSlug);
    }

    const linkData =
      data.hasExternalLink !== undefined || data.externalLink !== undefined
        ? {
            hasExternalLink: effectiveHasExternalLink,
            externalLink: effectiveHasExternalLink ? externalLink : null,
          }
        : {};

    await this.categoryRepository.update(
      id,
      organizationId,
      { ...data, ...linkData, slugPath },
      userId,
    );
  }
}
