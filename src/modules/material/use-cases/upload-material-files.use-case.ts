import { BadRequestException, NotFoundException } from '@common/filters';
import { generateId } from '@common/utils';
import { StorageService } from '@infrastructure/providers';
import { MaterialTemplateDocumentService } from '@modules/material-template/services/material-template-document.service';
import { validateMaterialTemplateImage } from '@modules/material-template/services/material-template-image.service';
import { Injectable } from '@nestjs/common';
import { MaterialFileItem, MaterialFileWithUrl } from '../entities';
import {
  CUSTOMIZABLE_IMAGE_COUNT_MESSAGE,
  CUSTOMIZABLE_PRINT_EXPORT_IN_PROGRESS_MESSAGE,
  MAX_CUSTOMIZABLE_MATERIAL_IMAGES,
} from '../material.constants';
import { MaterialRepository } from '../repository';
import { normalizeMaterialFileName } from '../utils/normalize-material-file-name';
import { FindMaterialByIdUseCase } from './find-material-by-id.use-case';

@Injectable()
export class UploadMaterialFilesUseCase {
  constructor(
    private readonly materialRepository: MaterialRepository,
    private readonly findMaterialByIdUseCase: FindMaterialByIdUseCase,
    private readonly storageService: StorageService,
    private readonly documentService: MaterialTemplateDocumentService,
  ) {}

  async execute(
    materialId: string,
    organizationId: string,
    files: Express.Multer.File[],
    userId: string,
  ): Promise<MaterialFileWithUrl[]> {
    const material = await this.findMaterialByIdUseCase.execute(
      materialId,
      organizationId,
    );

    if (!files?.length) {
      throw new BadRequestException(
        'Envie ao menos um arquivo para o material',
      );
    }

    if (material.isCustomizable) {
      return await this.uploadCustomizableImages(
        materialId,
        organizationId,
        files,
        userId,
      );
    }

    return await this.uploadFiles(materialId, organizationId, files, userId);
  }

  private async uploadFiles(
    materialId: string,
    organizationId: string,
    files: Express.Multer.File[],
    userId: string,
  ): Promise<MaterialFileWithUrl[]> {
    const folder = `materials/${materialId}`;
    const uploadedFiles: Array<{
      file: Express.Multer.File;
      upload: { path: string };
    }> = [];

    let materialFiles: MaterialFileItem[];

    try {
      for (const file of files) {
        uploadedFiles.push({
          file,
          upload: await this.storageService.uploadFile(file, folder),
        });
      }

      materialFiles = await this.materialRepository.createFiles(
        materialId,
        organizationId,
        uploadedFiles.map(({ file, upload }, index) => ({
          id: generateId(),
          fileKey: upload.path,
          originalName: normalizeMaterialFileName(file.originalname),
          mimeType: file.mimetype || 'application/octet-stream',
          size: Number.isFinite(file.size) ? file.size : 0,
          sortOrder: index,
        })),
        userId,
      );
    } catch (error) {
      await this.storageService.deleteFile(
        uploadedFiles.map(({ upload }) => upload.path),
      );
      throw error;
    }

    return await this.withPublicUrls(materialFiles);
  }

  private async uploadCustomizableImages(
    materialId: string,
    organizationId: string,
    files: Express.Multer.File[],
    userId: string,
  ): Promise<MaterialFileWithUrl[]> {
    const images = files.map((file) => validateMaterialTemplateImage(file));
    const context = await this.materialRepository.findCustomizableUploadContext(
      materialId,
      organizationId,
    );
    if (!context) {
      throw new NotFoundException('Template não encontrado');
    }
    if (context.activePrintExportCount > 0) {
      throw new BadRequestException(
        CUSTOMIZABLE_PRINT_EXPORT_IN_PROGRESS_MESSAGE,
      );
    }
    if (
      context.files.length + files.length >
      MAX_CUSTOMIZABLE_MATERIAL_IMAGES
    ) {
      throw new BadRequestException(CUSTOMIZABLE_IMAGE_COUNT_MESSAGE);
    }

    const addedFiles = files.map((file, index) => ({
      id: generateId(),
      file,
      image: images[index],
    }));
    const document = this.documentService.withAddedFiles(
      context.document,
      context.files,
      addedFiles.map(({ id, image }) => ({
        id,
        width: image.width,
        height: image.height,
      })),
    );

    const folder = `materials/${materialId}`;
    const uploadedFiles: Array<{
      id: string;
      file: Express.Multer.File;
      image: (typeof images)[number];
      upload: { path: string };
    }> = [];
    let materialFiles: MaterialFileItem[];

    try {
      for (const added of addedFiles) {
        uploadedFiles.push({
          ...added,
          upload: await this.storageService.uploadFile(
            { ...added.file, mimetype: added.image.mimeType },
            folder,
          ),
        });
      }

      materialFiles = await this.materialRepository.addCustomizableFiles(
        materialId,
        organizationId,
        uploadedFiles.map(({ id, file, image, upload }, index) => ({
          id,
          fileKey: upload.path,
          originalName: normalizeMaterialFileName(file.originalname),
          mimeType: image.mimeType,
          size: Number.isFinite(file.size) ? file.size : 0,
          width: image.width,
          height: image.height,
          sortOrder: index,
        })),
        {
          templateId: context.templateId,
          revision: context.revision,
          document,
          existingFileIds: context.files.map((file) => file.id),
        },
        userId,
      );
    } catch (error) {
      await this.storageService.deleteFile(
        uploadedFiles.map(({ upload }) => upload.path),
      );
      throw error;
    }

    return await this.withPublicUrls(materialFiles);
  }

  private async withPublicUrls(
    materialFiles: MaterialFileItem[],
  ): Promise<MaterialFileWithUrl[]> {
    return await Promise.all(
      materialFiles.map(async ({ fileKey, ...file }) => ({
        ...file,
        url: await this.storageService.getPublicUrl(fileKey),
      })),
    );
  }
}
