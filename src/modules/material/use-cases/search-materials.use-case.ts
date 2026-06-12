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
  ) {}

  async execute(
    organizationId: string,
    userId: string,
    filters: SearchMaterialsFiltersDTO = {},
  ): Promise<PaginatedResponse<MaterialListItem>> {
    return await this.materialRepository.search(
      organizationId,
      userId,
      filters,
    );
  }
}
