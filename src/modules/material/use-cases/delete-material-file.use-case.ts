import { BadRequestException, NotFoundException } from '@common/filters';
import { StorageService } from '@infrastructure/providers';
import { MaterialTemplateDocumentService } from '@modules/material-template/services/material-template-document.service';
import { Injectable } from '@nestjs/common';
import {
  CUSTOMIZABLE_DELETE_PRINT_EXPORT_MESSAGE,
  CUSTOMIZABLE_LAST_IMAGE_MESSAGE,
  MIN_CUSTOMIZABLE_MATERIAL_IMAGES,
} from '../material.constants';
import { MaterialRepository } from '../repository';
import { FindMaterialByIdUseCase } from './find-material-by-id.use-case';

@Injectable()
export class DeleteMaterialFileUseCase {
  constructor(
    private readonly materialRepository: MaterialRepository,
    private readonly findMaterialByIdUseCase: FindMaterialByIdUseCase,
    private readonly storageService: StorageService,
    private readonly documentService: MaterialTemplateDocumentService,
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
    const file = await this.materialRepository.findFileById(
      fileId,
      materialId,
      organizationId,
    );

    if (!file) {
      throw new NotFoundException('Arquivo do material não encontrado');
    }

    if (!material.isCustomizable) {
      await this.materialRepository.deleteFile(
        fileId,
        materialId,
        organizationId,
        userId,
      );
      await this.storageService.deleteFile([file.fileKey]);
      return;
    }

    const context = await this.materialRepository.findCustomizableUploadContext(
      materialId,
      organizationId,
    );
    if (!context) {
      throw new NotFoundException('Template não encontrado');
    }
    if (context.activePrintExportCount > 0) {
      throw new BadRequestException(CUSTOMIZABLE_DELETE_PRINT_EXPORT_MESSAGE);
    }
    if (context.files.length <= MIN_CUSTOMIZABLE_MATERIAL_IMAGES) {
      throw new BadRequestException(CUSTOMIZABLE_LAST_IMAGE_MESSAGE);
    }
    if (!context.files.some((candidate) => candidate.id === fileId)) {
      throw new NotFoundException('Arquivo do material não encontrado');
    }

    const document = this.documentService.withoutFile(
      context.document,
      context.files,
      fileId,
    );
    await this.materialRepository.deleteCustomizableFile(
      materialId,
      fileId,
      organizationId,
      {
        templateId: context.templateId,
        revision: context.revision,
        document,
        assetIds: this.documentService.getAssetIds(document),
        existingFileIds: context.files.map((candidate) => candidate.id),
      },
      userId,
    );
    await this.storageService.deleteFile([file.fileKey]);
  }
}
