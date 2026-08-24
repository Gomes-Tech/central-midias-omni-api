import { Inject, Injectable } from '@nestjs/common';
import type { MulterFile, StoredFile } from './local-storage.service';
import type { PrivateFileWrite } from './storage-provider';
import { STORAGE_PROVIDER, StorageProvider } from './storage-provider';

/** Máximo permitido pelo SigV4 com credenciais IAM permanentes: 7 dias. */
export const S3_MAX_SIGNED_URL_EXPIRES_IN = 7 * 24 * 60 * 60;

export interface StorageFile {
  id: string;
  path: string;
  fullPath: string;
  publicUrl: string;
}

@Injectable()
export class StorageService {
  constructor(
    @Inject(STORAGE_PROVIDER)
    private readonly storageProvider: StorageProvider,
  ) {}

  async uploadFile(
    file: MulterFile,
    folder?: string,
  ): Promise<{ path: string }> {
    return this.storageProvider.uploadFile(file, folder);
  }

  async readFile(path: string): Promise<Buffer> {
    return this.storageProvider.readFile(path);
  }

  async getPublicUrl(path: string, expiresIn?: number): Promise<string> {
    return this.storageProvider.getSignedUrl(path, expiresIn);
  }

  async getDownloadUrl(path: string, filename: string): Promise<string> {
    return this.storageProvider.getSignedDownloadUrl(path, filename);
  }

  async deleteFile(paths: string[]): Promise<void> {
    return this.storageProvider.deleteFile(paths);
  }

  async readAsset(path: string): Promise<Buffer> {
    return this.storageProvider.readAsset(path);
  }

  async writePrivateFile(file: PrivateFileWrite): Promise<void> {
    return this.storageProvider.writePrivateFile(file);
  }

  async storePublicationAttachment(params: {
    publicationId: string;
    file: MulterFile;
  }): Promise<StoredFile> {
    return this.storageProvider.storePublicationAttachment(params);
  }
}
