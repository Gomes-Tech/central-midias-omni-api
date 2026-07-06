import { StorageService } from '@infrastructure/providers';
import { Inject, Injectable } from '@nestjs/common';
import { MostAccessedMaterialItem } from '../entities';
import { MaterialRepository } from '../repository';
import { pickMaterialPreviewFile } from '../utils/pick-material-preview-file';

@Injectable()
export class FindMostAccessedMaterialsUseCase {
  constructor(
    @Inject('MaterialRepository')
    private readonly materialRepository: MaterialRepository,
    private readonly storageService: StorageService,
  ) {}

  async execute(
    organizationId: string,
    userId: string,
  ): Promise<MostAccessedMaterialItem[]> {
    const materials = await this.materialRepository.findMostViewedMaterials(
      organizationId,
      userId,
      3,
    );

    return await Promise.all(
      materials.map(async (material) => {
        const previewFile = pickMaterialPreviewFile(material.materialFiles);
        const url = previewFile
          ? await this.storageService.getPublicUrl(previewFile.imageKey, 900)
          : null;

        return {
          id: material.id,
          name: material.name,
          description: material.description,
          imageUrl: url,
        };
      }),
    );
  }
}
