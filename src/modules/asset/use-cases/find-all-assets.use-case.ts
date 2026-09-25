import { Injectable } from '@nestjs/common';
import { PaginatedResponse } from '../../../types';
import { FindAllAssetsFiltersDTO } from '../dto';
import { AssetResponse, toAssetResponse } from '../entities';
import { AssetRepository } from '../repository';
import { AssetStorageService } from '../services';

@Injectable()
export class FindAllAssetsUseCase {
  constructor(
    private readonly assetRepository: AssetRepository,
    private readonly assetStorageService: AssetStorageService,
  ) {}

  async execute(
    organizationId: string,
    filters: FindAllAssetsFiltersDTO = {},
  ): Promise<PaginatedResponse<AssetResponse>> {
    const result = await this.assetRepository.findAll(organizationId, filters);
    return {
      ...result,
      data: result.data.map((asset) =>
        toAssetResponse(
          asset,
          this.assetStorageService.getPublicUrl(asset.fileKey),
        ),
      ),
    };
  }
}
