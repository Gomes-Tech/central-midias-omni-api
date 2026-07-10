import { generateId } from '@common/utils';
import { BadRequestException } from '@common/filters';
import { StorageService } from '@infrastructure/providers';
import { FindCategoryByIdUseCase } from '@modules/category/use-cases';
import { Inject, Injectable } from '@nestjs/common';
import { CreateMaterialDTO } from '../dto';
import { MaterialRepository } from '../repository';
import { EnqueueMaterialAcceptanceEmailsUseCase } from './enqueue-material-acceptance-emails.use-case';
import { EnqueueMaterialNotificationEmailsUseCase } from './enqueue-material-notification-emails.use-case';
import { ResolveMaterialTagsUseCase } from './resolve-material-tags.use-case';

@Injectable()
export class CreateMaterialUseCase {
  constructor(
    @Inject('MaterialRepository')
    private readonly materialRepository: MaterialRepository,
    private readonly findCategoryByIdUseCase: FindCategoryByIdUseCase,
    private readonly resolveMaterialTagsUseCase: ResolveMaterialTagsUseCase,
    private readonly storageService: StorageService,
    private readonly enqueueMaterialAcceptanceEmailsUseCase: EnqueueMaterialAcceptanceEmailsUseCase,
    private readonly enqueueMaterialNotificationEmailsUseCase: EnqueueMaterialNotificationEmailsUseCase,
  ) {}

  async execute(
    organizationId: string,
    data: CreateMaterialDTO,
    userId: string,
    files: Express.Multer.File[] = [],
  ): Promise<void> {
    if (data.customization !== undefined && data.isCustomizable !== true) {
      throw new BadRequestException(
        'Customização só pode ser informada para materiais personalizáveis',
      );
    }

    const category = await this.findCategoryByIdUseCase.execute(
      data.categoryId,
      organizationId,
    );

    if (!category.isActive) {
      throw new BadRequestException('Categoria informada está inativa');
    }

    const existingMaterial = await this.materialRepository.findByName(
      data.name,
      data.categoryId,
    );

    if (existingMaterial) {
      throw new BadRequestException(
        'Já existe um material com este nome nesta categoria',
      );
    }

    const materialId = generateId();
    const folder = `materials/${materialId}`;
    const resolvedTags = await this.resolveMaterialTagsUseCase.execute(
      organizationId,
      data.tags,
    );
    const uploadedFiles: Array<{
      file: Express.Multer.File;
      upload: { path: string };
    }> = [];

    try {
      for (const file of files) {
        uploadedFiles.push({
          file,
          upload: await this.storageService.uploadFile(file, folder),
        });
      }

      await this.materialRepository.create(organizationId, data, userId, {
        id: materialId,
        files: uploadedFiles.map(({ file, upload }) => ({
          fileKey: upload.path,
          mimeType: file.mimetype || 'application/octet-stream',
          size: Number.isFinite(file.size) ? file.size : 0,
        })),
        tags: resolvedTags,
      });

      if (data.requiresAcceptance === true) {
        void this.enqueueMaterialAcceptanceEmailsUseCase
          .execute(materialId, organizationId)
          .catch(() => undefined);
      }

      if (data.notifyUsers === true) {
        void this.enqueueMaterialNotificationEmailsUseCase
          .execute(materialId, organizationId)
          .catch(() => undefined);
      }
    } catch (error) {
      if (uploadedFiles.length) {
        await this.storageService.deleteFile(
          uploadedFiles.map(({ upload }) => upload.path),
        );
      }
      throw error;
    }
  }
}
