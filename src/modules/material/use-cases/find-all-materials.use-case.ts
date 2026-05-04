import { Inject, Injectable } from '@nestjs/common';
import { FindAllMaterialsFiltersDTO } from '../dto';
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
  ) {
    return await this.materialRepository.findAll(organizationId, filters);
  }
}
