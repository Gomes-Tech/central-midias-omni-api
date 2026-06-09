import { Inject, Injectable } from '@nestjs/common';
import { PaginatedResponse } from '../../../types';
import { FindAllMaterialsFiltersDTO } from '../dto';
import { MaterialListItem } from '../entities';
import { MaterialRepository } from '../repository';

@Injectable()
export class FindAllMaterialsUseCase {
  constructor(
    @Inject('MaterialRepository')
    private readonly materialRepository: MaterialRepository,
  ) {}

  async execute(
    organizationId: string,
    filters: FindAllMaterialsFiltersDTO = {},
  ): Promise<PaginatedResponse<MaterialListItem>> {
    return await this.materialRepository.findAll(filters, organizationId);
  }
}
