import {
  STORAGE_PROVIDER,
  StorageProvider,
} from '@infrastructure/providers/storage/storage-provider';
import {
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PreparedAssetFile } from './asset-file-validation.service';

@Injectable()
export class AssetStorageService {
  constructor(
    @Inject(STORAGE_PROVIDER)
    private readonly storageProvider: StorageProvider,
  ) {}

  async upload(
    organizationId: string,
    assetId: string,
    file: PreparedAssetFile,
  ): Promise<{ fileKey: string }> {
    const fileKey = `organizations/${organizationId}/assets/${assetId}/${randomUUID()}.${file.extension}`;

    try {
      await this.storageProvider.uploadAsset({
        fileKey,
        buffer: file.buffer,
        mimeType: file.mimeType,
      });
      return { fileKey };
    } catch (error) {
      console.error('Erro: ', error);
      throw new InternalServerErrorException(
        'Erro ao fazer upload do asset no storage',
      );
    }
  }

  async deleteFile(fileKey: string): Promise<void> {
    try {
      await this.storageProvider.deleteAsset(fileKey);
    } catch {
      throw new InternalServerErrorException(
        'Erro ao remover asset do storage',
      );
    }
  }

  async deleteFiles(fileKeys: string[]): Promise<void> {
    await Promise.all(fileKeys.map((fileKey) => this.deleteFile(fileKey)));
  }

  async read(fileKey: string): Promise<Buffer> {
    try {
      return await this.storageProvider.readAsset(fileKey);
    } catch (error) {
      console.error('Erro: ', error);
      throw new InternalServerErrorException('Erro ao ler asset no storage');
    }
  }

  getPublicUrl(fileKey: string): string {
    return this.storageProvider.getAssetPublicUrl(fileKey);
  }
}
