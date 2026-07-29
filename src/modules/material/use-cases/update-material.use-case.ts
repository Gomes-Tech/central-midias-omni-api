import { BadRequestException } from '@common/filters';
import { StorageService } from '@infrastructure/providers';
import { FindCategoryByIdUseCase } from '@modules/category/use-cases';
import { validateMaterialTemplateImage } from '@modules/material-template/services/material-template-image.service';
import { Inject, Injectable } from '@nestjs/common';
import { UpdateMaterialDTO } from '../dto';
import { MaterialRepository } from '../repository';
import { EnqueueMaterialAcceptanceEmailsUseCase } from './enqueue-material-acceptance-emails.use-case';
import { EnqueueMaterialNotificationEmailsUseCase } from './enqueue-material-notification-emails.use-case';
import { FindMaterialByIdUseCase } from './find-material-by-id.use-case';
import { ResolveMaterialTagIdsUseCase } from './resolve-material-tag-ids.use-case';

@Injectable()
export class UpdateMaterialUseCase {
  constructor(
    @Inject('MaterialRepository')
    private readonly materialRepository: MaterialRepository,
    private readonly findMaterialByIdUseCase: FindMaterialByIdUseCase,
    private readonly findCategoryByIdUseCase: FindCategoryByIdUseCase,
    private readonly resolveMaterialTagIdsUseCase: ResolveMaterialTagIdsUseCase,
    private readonly storageService: StorageService,
    private readonly enqueueMaterialAcceptanceEmailsUseCase: EnqueueMaterialAcceptanceEmailsUseCase,
    private readonly enqueueMaterialNotificationEmailsUseCase: EnqueueMaterialNotificationEmailsUseCase,
  ) {}

  async execute(
    id: string,
    organizationId: string,
    data: UpdateMaterialDTO,
    userId: string,
  ): Promise<void> {
    const material = await this.findMaterialByIdUseCase.execute(
      id,
      organizationId,
    );

    const previousRequiresAcceptance = material.requiresAcceptance;
    let activateTemplate: { baseMaterialFileId: string } | undefined;
    if (data.isCustomizable === true && !material.isCustomizable) {
      const files = await this.materialRepository.findFilesByMaterialId(
        id,
        organizationId,
      );
      const base = files[0];
      if (
        files.length !== 1 ||
        !base ||
        !['image/png', 'image/jpeg', 'image/jpg'].includes(
          base.mimeType.toLowerCase(),
        )
      ) {
        throw new BadRequestException(
          'Material customizável deve possuir exatamente uma imagem PNG ou JPEG',
        );
      }
      const buffer = await this.storageService.readFile(base.fileKey);
      validateMaterialTemplateImage({ buffer, size: base.size });
      activateTemplate = { baseMaterialFileId: base.id };
    }

    const nextCategoryId = data.categoryId ?? material.categoryId;
    const nextName = data.name ?? material.name;

    if (data.categoryId && data.categoryId !== material.categoryId) {
      const category = await this.findCategoryByIdUseCase.execute(
        data.categoryId,
        organizationId,
      );

      if (!category.isActive) {
        throw new BadRequestException('Categoria informada está inativa');
      }
    }

    if (
      nextCategoryId !== material.categoryId ||
      nextName.toLowerCase() !== material.name.toLowerCase()
    ) {
      const existingMaterial = await this.materialRepository.findByName(
        nextName,
        nextCategoryId,
      );

      if (existingMaterial && existingMaterial.id !== id) {
        throw new BadRequestException(
          'Já existe um material com este nome nesta categoria',
        );
      }
    }

    const resolvedTags = await this.resolveMaterialTagIdsUseCase.execute(
      organizationId,
      data.tags,
    );

    await this.materialRepository.update(id, organizationId, data, userId, {
      tags: resolvedTags,
      activateTemplate,
    });

    if (
      data.requiresAcceptance === true &&
      previousRequiresAcceptance === false
    ) {
      void this.enqueueMaterialAcceptanceEmailsUseCase
        .execute(id, organizationId)
        .catch(() => undefined);
    }

    if (data.notifyUsers === true) {
      void this.enqueueMaterialNotificationEmailsUseCase
        .execute(id, organizationId, data.roleId)
        .catch(() => undefined);
    }
  }
}
