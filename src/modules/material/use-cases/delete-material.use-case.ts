import { Injectable } from '@nestjs/common';
import { MaterialRepository } from '../repository';
import { FindMaterialByIdUseCase } from './find-material-by-id.use-case';

@Injectable()
export class DeleteMaterialUseCase {
  constructor(
    private readonly materialRepository: MaterialRepository,
    private readonly findMaterialByIdUseCase: FindMaterialByIdUseCase,
  ) {}

  async execute(
    id: string,
    organizationId: string,
    userId: string,
  ): Promise<void> {
    await this.findMaterialByIdUseCase.execute(id, organizationId);

    await this.materialRepository.delete(id, organizationId, userId);
  }
}
