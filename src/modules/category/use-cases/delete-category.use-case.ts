import { BadRequestException } from '@common/filters';
import { Inject, Injectable } from '@nestjs/common';
import { CategoryRepository } from '../repository';
import { FindCategoryByIdUseCase } from './find-category-by-id.use-case';

@Injectable()
export class DeleteCategoryUseCase {
  constructor(
    @Inject('CategoryRepository')
    private readonly categoryRepository: CategoryRepository,
    private readonly findCategoryByIdUseCase: FindCategoryByIdUseCase,
  ) {}

  async execute(
    id: string,
    organizationId: string,
    userId: string,
    transferCategoryId?: string,
  ): Promise<void> {
    const category = await this.findCategoryByIdUseCase.execute(
      id,
      organizationId,
    );

    if (category.children.length > 0) {
      throw new BadRequestException(
        'Não é possível excluir uma categoria que possui subcategorias',
      );
    }

    const materialsCount = await this.categoryRepository.countMaterials(id);
    const isRootCategory = !category.parentId;

    if (isRootCategory && materialsCount > 0 && !transferCategoryId) {
      throw new BadRequestException(
        'Esta categoria possui materiais vinculados. Realoque esses materiais para outra categoria antes de excluí-la.',
      );
    }

    const destinationCategoryId = await this.resolveDestinationCategoryId(
      category.parentId,
      materialsCount,
      id,
      organizationId,
      transferCategoryId,
    );

    await this.categoryRepository.delete(
      id,
      organizationId,
      userId,
      destinationCategoryId,
    );
  }

  private async resolveDestinationCategoryId(
    parentId: string | null | undefined,
    materialsCount: number,
    categoryId: string,
    organizationId: string,
    transferCategoryId?: string,
  ): Promise<string | undefined> {
    if (materialsCount === 0) {
      return undefined;
    }

    if (parentId) {
      return parentId;
    }

    if (!transferCategoryId) {
      throw new BadRequestException(
        'Informe a categoria de destino para transferir os materiais',
      );
    }

    if (transferCategoryId === categoryId) {
      throw new BadRequestException(
        'A categoria de destino não pode ser a mesma que está sendo excluída',
      );
    }

    await this.findCategoryByIdUseCase.execute(
      transferCategoryId,
      organizationId,
    );

    return transferCategoryId;
  }
}
