import { ForbiddenException } from '@common/filters';
import { StorageService } from '@infrastructure/providers';
import { Inject, Injectable } from '@nestjs/common';
import { MaterialFileWithUrl } from '../entities';
import { MaterialRepository } from '../repository';
import { FindMaterialByIdUseCase } from './find-material-by-id.use-case';

@Injectable()
export class ViewMaterialFilesUseCase {
  constructor(
    private readonly findMaterialByIdUseCase: FindMaterialByIdUseCase,
    @Inject('MaterialRepository')
    private readonly materialRepository: MaterialRepository,
    private readonly storageService: StorageService,
  ) {}

  async execute(
    materialId: string,
    organizationId: string,
    userId: string,
  ): Promise<MaterialFileWithUrl[]> {
    const material = await this.findMaterialByIdUseCase.execute(
      materialId,
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

    const files = await this.materialRepository.findFilesByMaterialId(
      materialId,
      organizationId,
    );

    return await Promise.all(
      files.map(async ({ fileKey, ...file }) => ({
        ...file,
        url: await this.storageService.getPublicUrl(fileKey),
      })),
    );
  }
}
