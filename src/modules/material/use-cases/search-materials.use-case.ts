import { StorageService } from '@infrastructure/providers';
import { Inject, Injectable } from '@nestjs/common';
import { PaginatedResponse } from '../../../types';
import { SearchMaterialsFiltersDTO } from '../dto';
import { MaterialListItem } from '../entities';
import { MaterialRepository } from '../repository';

@Injectable()
export class SearchMaterialsUseCase {
  constructor(
    @Inject('MaterialRepository')
    private readonly materialRepository: MaterialRepository,
    private readonly storageService: StorageService,
  ) {}

  async execute(
    organizationId: string,
    userId: string,
    filters: SearchMaterialsFiltersDTO = {},
  ): Promise<PaginatedResponse<MaterialListItem & { materialFile: string }>> {
    const materials = await this.materialRepository.search(
      organizationId,
      userId,
      filters,
    );

    const materialsWithFile = await Promise.all(
      materials.data.map(async (material) => ({
        ...material,
        materialFile: await this.storageService.getPublicUrl(
          material.materialFile,
        ),
      })),
    );

    return {
      ...materials,
      data: materialsWithFile,
    };
  }
}
