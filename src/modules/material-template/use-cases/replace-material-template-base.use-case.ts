import { BadRequestException } from '@common/filters';
import { StorageService } from '@infrastructure/providers';
import { Injectable } from '@nestjs/common';
import { MaterialTemplateDocumentV1 } from '../entities';
import { MaterialTemplateRepository } from '../repository';
import {
  MaterialTemplateDocumentService,
  MaterialTemplateImageService,
  MaterialTemplateResponseService,
} from '../services';

@Injectable()
export class ReplaceMaterialTemplateBaseUseCase {
  constructor(
    private readonly repository: MaterialTemplateRepository,
    private readonly documentService: MaterialTemplateDocumentService,
    private readonly imageService: MaterialTemplateImageService,
    private readonly responseService: MaterialTemplateResponseService,
    private readonly storageService: StorageService,
  ) {}

  async execute(
    materialId: string,
    organizationId: string,
    userId: string,
    files: Express.Multer.File[],
  ) {
    if (files.length !== 1 || files[0]?.fieldname !== 'file') {
      throw new BadRequestException('Envie uma imagem no campo file');
    }
    const file = files[0];
    const image = this.imageService.validate(file);
    const template = await this.repository.findOrThrow(
      materialId,
      organizationId,
    );
    const currentDocument = template.document
      ? this.documentService.validate(template.document)
      : null;
    const scaledDocument: MaterialTemplateDocumentV1 | null = currentDocument
      ? this.documentService.scaleForBaseReplacement(
          currentDocument,
          image.width,
          image.height,
        )
      : null;
    const uploaded = await this.storageService.uploadFile(
      { ...file, mimetype: image.mimeType },
      `materials/${materialId}`,
    );
    try {
      const result = await this.repository.replaceBaseFile({
        template,
        fileKey: uploaded.path,
        mimeType: image.mimeType,
        size: file.size,
        document: scaledDocument,
        userId,
      });
      if (result.previousFileKey) {
        await this.storageService
          .deleteFile([result.previousFileKey])
          .catch(() => undefined);
      }
      return await this.responseService.resolve(result.template);
    } catch (error) {
      await this.storageService
        .deleteFile([uploaded.path])
        .catch(() => undefined);
      throw error;
    }
  }
}
