import { NotFoundException } from '@common/filters';
import { Injectable } from '@nestjs/common';
import { AssetEntity } from '../entities';
import { AssetRepository } from '../repository';

@Injectable()
export class FindAssetByIdUseCase {
  constructor(private readonly assetRepository: AssetRepository) {}

  async execute(id: string, organizationId: string): Promise<AssetEntity> {
    const asset = await this.assetRepository.findById(id, organizationId);
    if (!asset) {
      throw new NotFoundException('Asset não encontrado');
    }
    return asset;
  }
}
