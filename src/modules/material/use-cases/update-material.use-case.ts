import { BadRequestException } from '@common/filters';
import { FindCategoryByIdUseCase } from '@modules/category';
import { Inject, Injectable } from '@nestjs/common';
import { UpdateMaterialDTO } from '../dto';
import { MaterialRepository } from '../repository';
import { FindMaterialByIdUseCase } from './find-material-by-id.use-case';

@Injectable()
export class UpdateMaterialUseCase {
  constructor(
    @Inject('MaterialRepository')
    private readonly materialRepository: MaterialRepository,
    private readonly findMaterialByIdUseCase: FindMaterialByIdUseCase,
    private readonly findCategoryByIdUseCase: FindCategoryByIdUseCase,
  ) {}

  async execute(
    id: string,
    organizationId: string,
    data: UpdateMaterialDTO,
    userId: string,
  ): Promise<void> {
    const material = await this.findMaterialByIdUseCase.execute(
      id,
      organizationId,
    );

    const nextCategoryId = data.categoryId ?? material.categoryId;
    const nextName = data.name ?? material.name;

    if (data.categoryId && data.categoryId !== material.categoryId) {
      const category = await this.findCategoryByIdUseCase.execute(
        data.categoryId,
        organizationId,
      );

      if (!category.isActive) {
        throw new BadRequestException('Categoria informada está inativa');
      }
    }

    if (
      nextCategoryId !== material.categoryId ||
      nextName.toLowerCase() !== material.name.toLowerCase()
    ) {
      const existingMaterial = await this.materialRepository.findByName(
        nextName,
        nextCategoryId,
      );

      if (existingMaterial && existingMaterial.id !== id) {
        throw new BadRequestException(
          'Já existe um material com este nome nesta categoria',
        );
      }
    }

    await this.materialRepository.update(id, organizationId, data, userId);
  }
}
