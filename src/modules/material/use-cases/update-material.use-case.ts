import { BadRequestException } from '@common/filters';
import { FindCategoryByIdUseCase } from '@modules/category/use-cases';
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
    private readonly enqueueMaterialAcceptanceEmailsUseCase: EnqueueMaterialAcceptanceEmailsUseCase,
    private readonly enqueueMaterialNotificationEmailsUseCase: EnqueueMaterialNotificationEmailsUseCase,
  ) {}

  async execute(
    id: string,
    organizationId: string,
    data: UpdateMaterialDTO,
    userId: string,
  ): Promise<void> {
    if (data.customization !== undefined && data.isCustomizable !== true) {
      throw new BadRequestException(
        'Customização só pode ser informada para materiais personalizáveis',
      );
    }

    const material = await this.findMaterialByIdUseCase.execute(
      id,
      organizationId,
    );

    const previousRequiresAcceptance = material.requiresAcceptance;

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
        .execute(id, organizationId)
        .catch(() => undefined);
    }
  }
}
