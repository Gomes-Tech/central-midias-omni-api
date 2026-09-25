import { ForbiddenException, NotFoundException } from '@common/filters';
import { MaterialRepository } from '@modules/material/repository';
import { Injectable } from '@nestjs/common';
import { MaterialTemplateStatus } from '@prisma/client';
import { MaterialTemplateRepository } from '../repository';
import { MaterialTemplateResponseService } from '../services';

@Injectable()
export class GetPublishedMaterialTemplateUseCase {
  constructor(
    private readonly repository: MaterialTemplateRepository,
    private readonly materialRepository: MaterialRepository,
    private readonly responseService: MaterialTemplateResponseService,
  ) {}

  async execute(materialId: string, organizationId: string, userId: string) {
    const template = await this.repository.findOrThrow(
      materialId,
      organizationId,
    );
    if (
      !template.material.isCustomizable ||
      template.status !== MaterialTemplateStatus.PUBLISHED
    ) {
      throw new NotFoundException('Template publicado não encontrado');
    }
    const hasAccess = await this.materialRepository.userHasCategoryAccess(
      organizationId,
      template.material.categoryId,
      userId,
    );
    if (!hasAccess) {
      throw new ForbiddenException('Você não possui acesso a este material');
    }
    const response = await this.responseService.resolve(template);
    if (response.missingAssetIds.length) {
      throw new NotFoundException('Template publicado indisponível');
    }
    return { ...response, legacyImport: null };
  }
}
