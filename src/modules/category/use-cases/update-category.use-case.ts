import { BadRequestException } from '@common/filters';
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

    if (data.slug && data.slug !== category.slug) {
      const existingSlug = await this.categoryRepository.findBySlug(
        data.slug,
        organizationId,
      );

      if (existingSlug && existingSlug.id !== id) {
        throw new BadRequestException('Já existe uma categoria com este slug');
      }
    }

    const effectiveParentId =
      data.parentId !== undefined ? data.parentId : category.parentId;
    const effectiveOrder =
      typeof data.order === 'number' ? data.order : category.order;
    const parentChanged =
      data.parentId !== undefined && data.parentId !== category.parentId;
    const orderChanged =
      typeof data.order === 'number' && data.order !== category.order;

    if (parentChanged || orderChanged) {
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
        await this.findCategoryByIdUseCase.execute(
          data.parentId,
          organizationId,
        );

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

    await this.categoryRepository.update(id, organizationId, data, userId);
  }
}
