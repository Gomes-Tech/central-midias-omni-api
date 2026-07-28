import { BadRequestException } from '@common/filters';
import { LoggerService } from '@infrastructure/log';
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ASSET_UPLOAD_MAX_FILES } from '../asset.constants';
import { AssetResponse, toAssetResponse } from '../entities';
import { AssetRepository, CreateAssetInput } from '../repository';
import { AssetFileValidationService, AssetStorageService } from '../services';

@Injectable()
export class CreateAssetsUseCase {
  constructor(
    private readonly assetRepository: AssetRepository,
    private readonly assetFileValidationService: AssetFileValidationService,
    private readonly assetStorageService: AssetStorageService,
    private readonly logger: LoggerService,
  ) {}

  async execute(
    organizationId: string,
    files: Express.Multer.File[],
    userId: string,
  ): Promise<AssetResponse[]> {
    if (!files.length) {
      throw new BadRequestException('Envie ao menos um arquivo no campo files');
    }
    if (files.length > ASSET_UPLOAD_MAX_FILES) {
      throw new BadRequestException(
        `O lote pode conter no máximo ${ASSET_UPLOAD_MAX_FILES} arquivos`,
      );
    }
    if (files.some((file) => file.fieldname !== 'files')) {
      throw new BadRequestException(
        'Todos os arquivos devem ser enviados no campo files',
      );
    }

    const prepared = files.map((file) => ({
      id: randomUUID(),
      file: this.assetFileValidationService.prepare(file),
    }));
    const uploadResults = await Promise.allSettled(
      prepared.map((item) =>
        this.assetStorageService.upload(organizationId, item.id, item.file),
      ),
    );
    const uploadedKeys = uploadResults.flatMap((result) =>
      result.status === 'fulfilled' ? [result.value.fileKey] : [],
    );
    const uploadFailure = uploadResults.find(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    );

    if (uploadFailure) {
      await this.cleanup(uploadedKeys, organizationId);
      throw uploadFailure.reason;
    }

    const createData: CreateAssetInput[] = prepared.map((item, index) => ({
      id: item.id,
      name: item.file.defaultName,
      fileKey: uploadedKeys[index],
      mimeType: item.file.mimeType,
      size: item.file.size,
    }));

    try {
      const assets = await this.assetRepository.createMany(
        organizationId,
        createData,
        userId,
      );
      return assets.map((asset) =>
        toAssetResponse(
          asset,
          this.assetStorageService.getPublicUrl(asset.fileKey),
        ),
      );
    } catch (error) {
      await this.cleanup(uploadedKeys, organizationId);
      throw error;
    }
  }

  private async cleanup(
    fileKeys: string[],
    organizationId: string,
  ): Promise<void> {
    if (!fileKeys.length) return;
    try {
      await this.assetStorageService.deleteFiles(fileKeys);
    } catch (error) {
      void this.logger.error('Falha ao limpar uploads de assets', {
        error: String(error),
        organizationId,
        fileKeys,
      });
    }
  }
}
