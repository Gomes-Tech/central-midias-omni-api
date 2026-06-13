import { ForbiddenException } from '@common/filters';
import { Inject, Injectable } from '@nestjs/common';
import { MaterialDetails } from '../entities';
import { MaterialRepository } from '../repository';
import { FindMaterialByIdUseCase } from './find-material-by-id.use-case';

@Injectable()
export class ViewMaterialByIdUseCase {
  constructor(
    private readonly findMaterialByIdUseCase: FindMaterialByIdUseCase,
    @Inject('MaterialRepository')
    private readonly materialRepository: MaterialRepository,
  ) {}

  async execute(
    id: string,
    organizationId: string,
    userId: string,
  ): Promise<MaterialDetails> {
    const material = await this.findMaterialByIdUseCase.execute(
      id,
      organizationId,
      userId,
    );

    const hasAccess = await this.materialRepository.userHasCategoryAccess(
      organizationId,
      material.categoryId,
      userId,
    );

    if (!hasAccess) {
      throw new ForbiddenException('Você não possui acesso a este material');
    }

    await this.materialRepository.registerView(material.id);

    return material;
  }
}
