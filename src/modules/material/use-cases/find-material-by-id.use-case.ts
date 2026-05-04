import { NotFoundException } from '@common/filters';
import { Inject, Injectable } from '@nestjs/common';
import { MaterialRepository } from '../repository';

@Injectable()
export class FindMaterialByIdUseCase {
  constructor(
    @Inject('MaterialRepository')
    private readonly materialRepository: MaterialRepository,
  ) {}

  async execute(id: string, organizationId: string) {
    const material = await this.materialRepository.findById(id, organizationId);

    if (!material) {
      throw new NotFoundException('Material não encontrado');
    }

    return material;
  }
}
