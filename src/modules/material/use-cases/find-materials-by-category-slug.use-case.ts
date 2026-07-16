import { StorageService } from '@infrastructure/providers';
import { Inject, Injectable } from '@nestjs/common';
import { PaginatedResponse } from '../../../types';
import { FindMaterialsByCategorySlugFiltersDTO } from '../dto';
import { MaterialByCategorySlugItem } from '../entities';
import { MaterialRepository } from '../repository';

@Injectable()
export class FindMaterialsByCategorySlugUseCase {
  constructor(
    @Inject('MaterialRepository')
    private readonly materialRepository: MaterialRepository,
    private readonly storageService: StorageService,
  ) {}

  async execute(
    organizationId: string,
    slugPath: string,
    filters: FindMaterialsByCategorySlugFiltersDTO = {},
  ): Promise<PaginatedResponse<MaterialByCategorySlugItem>> {
    const result = await this.materialRepository.findByCategorySlugPath(
      organizationId,
      slugPath,
      filters,
    );

    const data = await Promise.all(
      result.data.map(async (material) => {
        const isImage = material.mimeType?.startsWith('image/') ?? false;
        const imageUrl =
          isImage && material.imageKey
            ? await this.storageService
                .getPublicUrl(material.imageKey, 840)
                .catch(() => null)
            : null;

        return {
          id: material.id,
          name: material.name,
          description: material.description,
          imageUrl,
          mimeType: material.mimeType,
          size: material.size,
          externalLink: material.externalLink,
          hasTextCopy: material.hasTextCopy,
          textCopy: material.textCopy,
          isCustomizable: material.isCustomizable,
        };
      }),
    );

    return {
      data,
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
    };
  }
}
