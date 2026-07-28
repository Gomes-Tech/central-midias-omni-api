import type { StorageProvider } from '@infrastructure/providers/storage/storage-provider';
import { InternalServerErrorException } from '@nestjs/common';
import { AssetStorageService } from './asset-storage.service';

describe('AssetStorageService', () => {
  const uploadAsset = jest.fn();
  const deleteAsset = jest.fn();
  const getAssetPublicUrl = jest.fn();
  const storageProvider = {
    uploadAsset,
    deleteAsset,
    getAssetPublicUrl,
  } as unknown as StorageProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    uploadAsset.mockResolvedValue(undefined);
    deleteAsset.mockResolvedValue(undefined);
    getAssetPublicUrl.mockReturnValue('https://storage.test/asset.png');
  });

  it('deve enviar o asset ao provider ativo e retornar a chave', async () => {
    const service = new AssetStorageService(storageProvider);

    const result = await service.upload('org-1', 'asset-1', {
      buffer: Buffer.from('svg'),
      extension: 'svg',
      mimeType: 'image/svg+xml',
      size: 3,
      defaultName: 'logo',
    });

    expect(result.fileKey).toMatch(
      /^organizations\/org-1\/assets\/asset-1\/.+\.svg$/,
    );
    expect(uploadAsset).toHaveBeenCalledWith({
      fileKey: result.fileKey,
      buffer: expect.any(Buffer),
      mimeType: 'image/svg+xml',
    });
  });

  it('deve obter URL pública e remover arquivo pelo provider ativo', async () => {
    const service = new AssetStorageService(storageProvider);
    const key = 'organizations/org-1/assets/a/file.png';

    expect(service.getPublicUrl(key)).toBe('https://storage.test/asset.png');
    expect(getAssetPublicUrl).toHaveBeenCalledWith(key);

    await service.deleteFile(key);
    expect(deleteAsset).toHaveBeenCalledWith(key);
  });

  it('deve remover vários arquivos', async () => {
    const service = new AssetStorageService(storageProvider);

    await service.deleteFiles(['one.png', 'two.png']);

    expect(deleteAsset).toHaveBeenCalledTimes(2);
    expect(deleteAsset).toHaveBeenCalledWith('one.png');
    expect(deleteAsset).toHaveBeenCalledWith('two.png');
  });

  it('deve propagar falhas de upload e exclusão como erro interno', async () => {
    uploadAsset.mockRejectedValue(new Error('storage'));
    deleteAsset.mockRejectedValue(new Error('storage'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const service = new AssetStorageService(storageProvider);
    const prepared = {
      buffer: Buffer.from('png'),
      extension: 'png' as const,
      mimeType: 'image/png' as const,
      size: 3,
      defaultName: 'logo',
    };

    await expect(
      service.upload('org', 'asset', prepared),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
    await expect(service.deleteFile('key')).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );

    consoleSpy.mockRestore();
  });
});
