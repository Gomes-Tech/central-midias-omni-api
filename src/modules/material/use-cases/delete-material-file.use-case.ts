import { BadRequestException, NotFoundException } from '@common/filters';
import { StorageService } from '@infrastructure/providers';
import { Injectable } from '@nestjs/common';
import { MaterialRepository } from '../repository';
import { FindMaterialByIdUseCase } from './find-material-by-id.use-case';

@Injectable()
export class DeleteMaterialFileUseCase {
  constructor(
    private readonly materialRepository: MaterialRepository,
    private readonly findMaterialByIdUseCase: FindMaterialByIdUseCase,
    private readonly storageService: StorageService,
  ) {}

  async execute(
    materialId: string,
    fileId: string,
    organizationId: string,
    userId: string,
  ): Promise<void> {
    const material = await this.findMaterialByIdUseCase.execute(
      materialId,
      organizationId,
    );

    if (material.isCustomizable) {
      throw new BadRequestException(
        'A imagem base de um material customizável só pode ser substituída',
      );
    }

    const file = await this.materialRepository.findFileById(
      fileId,
      materialId,
      organizationId,
    );

    if (!file) {
      throw new NotFoundException('Arquivo do material não encontrado');
    }

    await this.materialRepository.deleteFile(
      fileId,
      materialId,
      organizationId,
      userId,
    );

    await this.storageService.deleteFile([file.fileKey]);
  }
}
