import { ForbiddenException } from '@common/filters';
import { StorageService } from '@infrastructure/providers';
import { CategoryRepository } from '@modules/category/repository';
import { Inject, Injectable } from '@nestjs/common';
import { PaginatedResponse } from '../../../types';
import { FindMaterialsByCategorySlugFiltersDTO } from '../dto';
import { MaterialByCategorySlugItem } from '../entities';
import { MaterialRepository } from '../repository';

@Injectable()
export class FindMaterialsByCategorySlugUseCase {
  constructor(
    @Inject('MaterialRepository')
    private readonly materialRepository: MaterialRepository,
    @Inject('CategoryRepository')
    private readonly categoryRepository: CategoryRepository,
    private readonly storageService: StorageService,
  ) {}

  async execute(
    organizationId: string,
    slugPath: string,
    userId: string,
    filters: FindMaterialsByCategorySlugFiltersDTO = {},
  ): Promise<PaginatedResponse<MaterialByCategorySlugItem>> {
    const category = await this.categoryRepository.findBySlugPath(
      slugPath,
      organizationId,
    );

    if (category) {
      const hasAccess = await this.materialRepository.userHasCategoryAccess(
        organizationId,
        category.id,
        userId,
      );

      if (!hasAccess) {
        throw new ForbiddenException(
          'Você não possui acesso ao conteúdo desta categoria',
        );
      }
    }

    const result = await this.materialRepository.findByCategorySlugPath(
      organizationId,
      slugPath,
      filters,
    );

    const data = await Promise.all(
      result.data.map(async (material) => {
        const isImage = material.mimeType?.startsWith('image/') ?? false;
        const imageUrl =
          isImage && material.imageKey
            ? await this.storageService
                .getPublicUrl(material.imageKey, 840)
                .catch(() => null)
            : null;

        return {
          id: material.id,
          name: material.name,
          description: material.description,
          imageUrl,
          mimeType: material.mimeType,
          size: material.size,
          externalLink: material.externalLink,
          hasTextCopy: material.hasTextCopy,
          onlyView: material.onlyView,
          textCopy: material.textCopy,
          isCustomizable: material.isCustomizable,
          canCustomize: material.canCustomize,
          requiresAcceptance: material.requiresAcceptance,
        };
      }),
    );

    return {
      data,
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
    };
  }
}
