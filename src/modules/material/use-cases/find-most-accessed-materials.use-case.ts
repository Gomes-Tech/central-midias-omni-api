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
    const topViewed = await this.materialRepository.findMostViewedMaterials(
      organizationId,
      userId,
      3,
    );

    const selected = [...topViewed];
    const excludeIds = selected.map((material) => material.id);

    if (selected.length < 3) {
      const fallback =
        await this.materialRepository.findLatestMaterialsPerCategory(
          organizationId,
          userId,
          3 - selected.length,
          excludeIds,
        );

      selected.push(...fallback);
    }

    return await Promise.all(
      selected.map(async (material) => {
        const previewFile = pickMaterialPreviewFile(material.materialFiles);
        const url = previewFile
          ? await this.storageService.getPublicUrl(previewFile.imageKey)
          : null;

        return {
          id: material.id,
          name: material.name,
          description: material.description,
          mobileUrl: url,
          desktopUrl: url,
        };
      }),
    );
  }
}
