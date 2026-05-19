import { StorageService } from '@infrastructure/providers';
import { Injectable } from '@nestjs/common';
import { MaterialFileWithUrl } from '../entities';
import { MaterialRepository } from '../repository';
import { FindMaterialByIdUseCase } from './find-material-by-id.use-case';

@Injectable()
export class FindMaterialFilesUseCase {
  constructor(
    private readonly materialRepository: MaterialRepository,
    private readonly findMaterialByIdUseCase: FindMaterialByIdUseCase,
    private readonly storageService: StorageService,
  ) {}

  async execute(
    materialId: string,
    organizationId: string,
  ): Promise<MaterialFileWithUrl[]> {
    await this.findMaterialByIdUseCase.execute(materialId, organizationId);

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
