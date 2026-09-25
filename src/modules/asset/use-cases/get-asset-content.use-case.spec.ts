import { NotFoundException } from '@common/filters';
import { InternalServerErrorException } from '@nestjs/common';
import { AssetEntity } from '../entities';
import { AssetStorageService } from '../services';
import { FindAssetByIdUseCase } from './find-asset-by-id.use-case';
import { GetAssetContentUseCase } from './get-asset-content.use-case';

describe('GetAssetContentUseCase', () => {
  const asset: AssetEntity = {
    id: 'asset-id',
    organizationId: 'org-id',
    name: 'Logo',
    fileKey: 'organizations/org-id/assets/asset-id/file.png',
    mimeType: 'image/png',
    size: 4,
    width: 10,
    height: 10,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  };

  const findAssetByIdUseCase = {
    execute: jest.fn(),
  };
  const assetStorageService = {
    read: jest.fn(),
  };
  const useCase = new GetAssetContentUseCase(
    findAssetByIdUseCase as unknown as FindAssetByIdUseCase,
    assetStorageService as unknown as AssetStorageService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lê o arquivo pela credencial do provider, no bucket da organização', async () => {
    findAssetByIdUseCase.execute.mockResolvedValue(asset);
    assetStorageService.read.mockResolvedValue(Buffer.from('png'));

    await expect(
      useCase.execute(asset.id, asset.organizationId),
    ).resolves.toEqual({
      buffer: Buffer.from('png'),
      mimeType: 'image/png',
    });
    expect(findAssetByIdUseCase.execute).toHaveBeenCalledWith(
      asset.id,
      asset.organizationId,
    );
    expect(assetStorageService.read).toHaveBeenCalledWith(asset.fileKey);
  });

  it('não lê o storage quando o asset não pertence à organização', async () => {
    findAssetByIdUseCase.execute.mockRejectedValue(
      new NotFoundException('Asset não encontrado'),
    );

    await expect(useCase.execute(asset.id, 'other-org')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(assetStorageService.read).not.toHaveBeenCalled();
  });

  it('propaga falha de leitura do storage', async () => {
    findAssetByIdUseCase.execute.mockResolvedValue(asset);
    assetStorageService.read.mockRejectedValue(
      new InternalServerErrorException('Erro ao ler asset no storage'),
    );

    await expect(
      useCase.execute(asset.id, asset.organizationId),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});
