import { StorageService } from '@infrastructure/providers';
import { Inject, Injectable } from '@nestjs/common';
import { MaterialMosaicItem } from '../entities';
import { MaterialRepository } from '../repository';
import { pickMaterialImageFile } from '../utils/pick-material-image-file';

@Injectable()
export class FindMaterialMosaicUseCase {
  constructor(
    @Inject('MaterialRepository')
    private readonly materialRepository: MaterialRepository,
    private readonly storageService: StorageService,
  ) {}

  async execute(
    organizationId: string,
    userId: string,
  ): Promise<MaterialMosaicItem[]> {
    const materials =
      await this.materialRepository.findLatestImageMaterialsPerCategory(
        organizationId,
        userId,
        6,
      );

    return await Promise.all(
      materials.map(async (material) => {
        const imageFile = pickMaterialImageFile(material.materialFiles);

        return {
          id: material.id,
          imageUrl: imageFile
            ? await this.storageService.getPublicUrl(imageFile.imageKey, 900)
            : null,
        };
      }),
    );
  }
}
