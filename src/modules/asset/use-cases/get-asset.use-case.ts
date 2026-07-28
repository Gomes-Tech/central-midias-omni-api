import { Injectable } from '@nestjs/common';
import { AssetResponse, toAssetResponse } from '../entities';
import { AssetStorageService } from '../services';
import { FindAssetByIdUseCase } from './find-asset-by-id.use-case';

@Injectable()
export class GetAssetUseCase {
  constructor(
    private readonly findAssetByIdUseCase: FindAssetByIdUseCase,
    private readonly assetStorageService: AssetStorageService,
  ) {}

  async execute(id: string, organizationId: string): Promise<AssetResponse> {
    const asset = await this.findAssetByIdUseCase.execute(id, organizationId);
    return toAssetResponse(
      asset,
      this.assetStorageService.getPublicUrl(asset.fileKey),
    );
  }
}
