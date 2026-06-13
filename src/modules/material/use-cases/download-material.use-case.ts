import { ForbiddenException } from '@common/filters';
import { StorageService } from '@infrastructure/providers';
import { Inject, Injectable } from '@nestjs/common';
import { posix } from 'node:path';
import { MaterialFileWithUrl } from '../entities';
import { MaterialRepository } from '../repository';
import { FindMaterialByIdUseCase } from './find-material-by-id.use-case';

@Injectable()
export class DownloadMaterialUseCase {
  constructor(
    private readonly findMaterialByIdUseCase: FindMaterialByIdUseCase,
    @Inject('MaterialRepository')
    private readonly materialRepository: MaterialRepository,
    private readonly storageService: StorageService,
  ) {}

  async execute(
    id: string,
    organizationId: string,
    userId: string,
  ): Promise<MaterialFileWithUrl[]> {
    const material = await this.findMaterialByIdUseCase.execute(
      id,
      organizationId,
      userId,
    );

    const hasAccess = await this.materialRepository.userHasCategoryAccess(
      organizationId,
      material.categoryId,
      userId,
    );

    if (!hasAccess) {
      throw new ForbiddenException('Você não possui acesso a este material');
    }

    const files = await this.materialRepository.findFilesByMaterialId(
      id,
      organizationId,
    );

    if (files.length > 0) {
      await this.materialRepository.registerDownload(id, userId);
    }

    return await Promise.all(
      files.map(async (file) => {
        const filename = posix.basename(file.fileKey);

        return {
          id: file.id,
          materialId: file.materialId,
          mimeType: file.mimeType,
          size: file.size,
          url: await this.storageService.getDownloadUrl(file.fileKey, filename),
        };
      }),
    );
  }
}
