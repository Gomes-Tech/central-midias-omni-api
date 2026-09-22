import { BadRequestException } from '@common/filters';
import { generateId } from '@common/utils';
import { StorageService } from '@infrastructure/providers';
import { Injectable } from '@nestjs/common';
import { MaterialFileItem, MaterialFileWithUrl } from '../entities';
import { MaterialRepository } from '../repository';
import { normalizeMaterialFileName } from '../utils/normalize-material-file-name';
import { FindMaterialByIdUseCase } from './find-material-by-id.use-case';

@Injectable()
export class UploadMaterialFilesUseCase {
  constructor(
    private readonly materialRepository: MaterialRepository,
    private readonly findMaterialByIdUseCase: FindMaterialByIdUseCase,
    private readonly storageService: StorageService,
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

    if (material.isCustomizable) {
      throw new BadRequestException(
        'Use a substituição de imagem base para materiais customizáveis',
      );
    }

    if (!files?.length) {
      throw new BadRequestException(
        'Envie ao menos um arquivo para o material',
      );
    }

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

    return await Promise.all(
      materialFiles.map(async ({ fileKey, ...file }) => ({
        ...file,
        url: await this.storageService.getPublicUrl(fileKey),
      })),
    );
  }
}
