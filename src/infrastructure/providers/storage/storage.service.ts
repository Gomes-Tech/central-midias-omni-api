import { Inject, Injectable } from '@nestjs/common';
import type { MulterFile, StoredFile } from './local-storage.service';
import { STORAGE_PROVIDER, StorageProvider } from './storage-provider';

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

  async getPublicUrl(path: string, expiresIn?: number): Promise<string> {
    return this.storageProvider.getSignedUrl(path, expiresIn);
  }

  async getDownloadUrl(path: string, filename: string): Promise<string> {
    return this.storageProvider.getSignedDownloadUrl(path, filename);
  }

  async deleteFile(paths: string[]): Promise<void> {
    return this.storageProvider.deleteFile(paths);
  }

  async storePublicationAttachment(params: {
    publicationId: string;
    file: MulterFile;
  }): Promise<StoredFile> {
    return this.storageProvider.storePublicationAttachment(params);
  }
}
