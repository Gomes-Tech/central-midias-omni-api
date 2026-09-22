import { BadRequestException } from '@common/filters';
import { StorageService } from '@infrastructure/providers';
import { FindCategoryByIdUseCase } from '@modules/category/use-cases';
import {
  MATERIAL_TEMPLATE_IMAGE_MAX_BYTES,
  validateMaterialTemplateImage,
} from '@modules/material-template/services/material-template-image.service';
import { Inject, Injectable } from '@nestjs/common';
import { UpdateMaterialDTO } from '../dto';
import {
  MAX_CUSTOMIZABLE_MATERIAL_IMAGES,
  MIN_CUSTOMIZABLE_MATERIAL_IMAGES,
} from '../material.constants';
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
    let activateTemplate:
      | {
          baseMaterialFileId: string;
          baseMimeType: string;
          validatedFiles: Array<{
            id: string;
            mimeType: 'image/png' | 'image/jpeg';
            width: number;
            height: number;
          }>;
        }
      | undefined;
    if (data.isCustomizable === true && !material.isCustomizable) {
      const files = await this.materialRepository.findFilesByMaterialId(
        id,
        organizationId,
      );
      const base = files[0];
      if (
        files.length < MIN_CUSTOMIZABLE_MATERIAL_IMAGES ||
        files.length > MAX_CUSTOMIZABLE_MATERIAL_IMAGES ||
        !base
      ) {
        throw new BadRequestException(
          `Material customizável deve possuir de ${MIN_CUSTOMIZABLE_MATERIAL_IMAGES} a ${MAX_CUSTOMIZABLE_MATERIAL_IMAGES} imagens PNG ou JPEG`,
        );
      }

      const validatedFiles: NonNullable<
        typeof activateTemplate
      >['validatedFiles'] = [];
      for (const file of files) {
        if (file.size > MATERIAL_TEMPLATE_IMAGE_MAX_BYTES) {
          throw new BadRequestException(
            'A imagem base deve ter no máximo 5 MB',
          );
        }
        const buffer = await this.storageService.readFile(file.fileKey);
        const metadata = validateMaterialTemplateImage({
          buffer,
          size: file.size,
        });
        validatedFiles.push({ id: file.id, ...metadata });
      }

      activateTemplate = {
        baseMaterialFileId: base.id,
        baseMimeType: validatedFiles[0].mimeType,
        validatedFiles,
      };
    }

    const willBeCustomizable =
      data.isCustomizable === true ||
      (data.isCustomizable !== false && material.isCustomizable);
    if (willBeCustomizable) {
      await this.assertExportConfig(
        organizationId,
        data.exportTypes ?? material.exportTypes,
        data.printPresetId !== undefined
          ? data.printPresetId
          : material.printPresetId,
      );
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

  private async assertExportConfig(
    organizationId: string,
    exportTypes: Array<'png' | 'jpg' | 'pdf' | 'print_pdf'>,
    printPresetId: string | null,
  ) {
    if (!exportTypes.includes('print_pdf')) {
      return;
    }
    if (!printPresetId) {
      throw new BadRequestException('Selecione um preset de impressão');
    }
    const isActive = await this.materialRepository.isActivePrintPreset(
      organizationId,
      printPresetId,
    );
    if (!isActive) {
      throw new BadRequestException('Preset de impressão indisponível');
    }
  }
}
