import { BadRequestException, NotFoundException } from '@common/filters';
import { StorageService } from '@infrastructure/providers';
import { MaterialTemplateDocumentService } from '@modules/material-template/services/material-template-document.service';
import { validateMaterialTemplateImage } from '@modules/material-template/services/material-template-image.service';
import { Injectable } from '@nestjs/common';
import { MaterialFileWithUrl } from '../entities';
import {
  CUSTOMIZABLE_REPLACE_NOT_CUSTOMIZABLE_MESSAGE,
  CUSTOMIZABLE_REPLACE_PRINT_EXPORT_MESSAGE,
  CUSTOMIZABLE_REPLACE_SINGLE_FILE_MESSAGE,
} from '../material.constants';
import { MaterialRepository } from '../repository';
import { normalizeMaterialFileName } from '../utils/normalize-material-file-name';
import { FindMaterialByIdUseCase } from './find-material-by-id.use-case';

@Injectable()
export class ReplaceMaterialFileUseCase {
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
    files: Express.Multer.File[],
    userId: string,
  ): Promise<MaterialFileWithUrl> {
    if (files.length !== 1) {
      throw new BadRequestException(CUSTOMIZABLE_REPLACE_SINGLE_FILE_MESSAGE);
    }
    const file = files[0];

    const material = await this.findMaterialByIdUseCase.execute(
      materialId,
      organizationId,
    );
    if (!material.isCustomizable) {
      throw new BadRequestException(
        CUSTOMIZABLE_REPLACE_NOT_CUSTOMIZABLE_MESSAGE,
      );
    }

    const image = validateMaterialTemplateImage(file);
    const context = await this.materialRepository.findCustomizableUploadContext(
      materialId,
      organizationId,
    );
    if (!context) {
      throw new NotFoundException('Template não encontrado');
    }
    if (context.activePrintExportCount > 0) {
      throw new BadRequestException(CUSTOMIZABLE_REPLACE_PRINT_EXPORT_MESSAGE);
    }
    if (!context.files.some((candidate) => candidate.id === fileId)) {
      throw new NotFoundException('Arquivo do material não encontrado');
    }

    const currentDocument =
      context.document == null
        ? null
        : this.documentService.validate(context.document);
    const document =
      currentDocument && !context.printPresetId
        ? this.documentService.scaleForBaseReplacement(
            currentDocument,
            image.width,
            image.height,
            fileId,
          )
        : currentDocument;

    const uploaded = await this.storageService.uploadFile(
      { ...file, mimetype: image.mimeType },
      `materials/${materialId}`,
    );
    const result = await this.materialRepository
      .replaceCustomizableFile(
        materialId,
        fileId,
        organizationId,
        {
          templateId: context.templateId,
          revision: context.revision,
          document,
          fileKey: uploaded.path,
          originalName: normalizeMaterialFileName(file.originalname),
          mimeType: image.mimeType,
          size: Number.isFinite(file.size) ? file.size : 0,
          width: image.width,
          height: image.height,
        },
        userId,
      )
      .catch(async (error: unknown) => {
        await this.storageService
          .deleteFile([uploaded.path])
          .catch(() => undefined);
        throw error;
      });

    await this.storageService
      .deleteFile([result.previousFileKey])
      .catch(() => undefined);

    const { fileKey, ...rest } = result.file;
    return {
      ...rest,
      url: await this.storageService.getPublicUrl(fileKey),
    };
  }
}
