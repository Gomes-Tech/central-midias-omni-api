import { Injectable } from '@nestjs/common';
import { AssetStorageService } from '../services';
import { FindAssetByIdUseCase } from './find-asset-by-id.use-case';

export interface AssetContent {
  buffer: Buffer;
  mimeType: string;
}

@Injectable()
export class GetAssetContentUseCase {
  constructor(
    private readonly findAssetByIdUseCase: FindAssetByIdUseCase,
    private readonly assetStorageService: AssetStorageService,
  ) {}

  async execute(id: string, organizationId: string): Promise<AssetContent> {
    const asset = await this.findAssetByIdUseCase.execute(id, organizationId);
    return {
      buffer: await this.assetStorageService.read(asset.fileKey),
      mimeType: asset.mimeType,
    };
  }
}
