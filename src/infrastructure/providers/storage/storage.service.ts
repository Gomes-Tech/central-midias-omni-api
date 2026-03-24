import { Injectable } from '@nestjs/common';
import { LocalStorageService, MulterFile } from './local-storage.service';

export interface StorageFile {
  id: string;
  path: string;
  fullPath: string;
  publicUrl: string;
}

@Injectable()
export class StorageService {
  constructor(private readonly localStorageService: LocalStorageService) {}

  async uploadFile(file: MulterFile, folder?: string): Promise<StorageFile> {
    return await this.localStorageService.uploadFile(file, folder);
  }

  getPublicUrl(path: string) {
    return this.localStorageService.getPublicUrl(path);
  }

  async deleteFile(paths: string[]): Promise<void> {
    return await this.localStorageService.deleteFile(paths);
  }
}
