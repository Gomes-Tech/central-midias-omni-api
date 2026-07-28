import { BadRequestException } from '@common/filters';
import { LoggerService } from '@infrastructure/log';
import { Injectable } from '@nestjs/common';
import { UpdateAssetDTO } from '../dto';
import { AssetResponse, toAssetResponse } from '../entities';
import { AssetRepository, UpdateAssetInput } from '../repository';
import { AssetFileValidationService, AssetStorageService } from '../services';
import { FindAssetByIdUseCase } from './find-asset-by-id.use-case';

@Injectable()
export class UpdateAssetUseCase {
  constructor(
    private readonly assetRepository: AssetRepository,
    private readonly findAssetByIdUseCase: FindAssetByIdUseCase,
    private readonly assetFileValidationService: AssetFileValidationService,
    private readonly assetStorageService: AssetStorageService,
    private readonly logger: LoggerService,
  ) {}

  async execute(
    id: string,
    organizationId: string,
    data: UpdateAssetDTO,
    files: Express.Multer.File[],
    userId: string,
  ): Promise<AssetResponse> {
    if (files.length > 1 || files.some((file) => file.fieldname !== 'file')) {
      throw new BadRequestException('Envie no máximo um arquivo no campo file');
    }
    if (data.name === undefined && files.length === 0) {
      throw new BadRequestException('Informe um nome ou um novo arquivo');
    }
    if (data.name !== undefined && !data.name.trim()) {
      throw new BadRequestException('O nome do asset não pode ser vazio');
    }

    const current = await this.findAssetByIdUseCase.execute(id, organizationId);
    const update: UpdateAssetInput = {
      ...(data.name !== undefined && { name: data.name.trim() }),
    };
    let newFileKey: string | undefined;

    if (files[0]) {
      const prepared = this.assetFileValidationService.prepare(files[0]);
      const uploaded = await this.assetStorageService.upload(
        organizationId,
        id,
        prepared,
      );
      newFileKey = uploaded.fileKey;
      Object.assign(update, {
        fileKey: uploaded.fileKey,
        mimeType: prepared.mimeType,
        size: prepared.size,
      });
    }

    let updated;
    try {
      updated = await this.assetRepository.update(
        id,
        organizationId,
        update,
        userId,
      );
    } catch (error) {
      if (newFileKey) {
        await this.assetStorageService
          .deleteFile(newFileKey)
          .catch(() => undefined);
      }
      throw error;
    }

    if (newFileKey) {
      try {
        await this.assetStorageService.deleteFile(current.fileKey);
      } catch (error) {
        void this.logger.error('Falha ao remover versão anterior do asset', {
          error: String(error),
          assetId: id,
          organizationId,
          fileKey: current.fileKey,
        });
      }
    }

    return toAssetResponse(
      updated,
      this.assetStorageService.getPublicUrl(updated.fileKey),
    );
  }
}
