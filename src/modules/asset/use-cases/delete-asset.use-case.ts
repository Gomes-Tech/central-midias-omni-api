import { Injectable } from '@nestjs/common';
import { AssetRepository } from '../repository';
import { AssetStorageService } from '../services';
import { FindAssetByIdUseCase } from './find-asset-by-id.use-case';

@Injectable()
export class DeleteAssetUseCase {
  constructor(
    private readonly assetRepository: AssetRepository,
    private readonly findAssetByIdUseCase: FindAssetByIdUseCase,
    private readonly assetStorageService: AssetStorageService,
  ) {}

  async execute(
    id: string,
    organizationId: string,
    userId: string,
  ): Promise<void> {
    const asset = await this.findAssetByIdUseCase.execute(id, organizationId);
    await this.assetStorageService.deleteFile(asset.fileKey);
    await this.assetRepository.delete(id, organizationId, userId);
  }
}
