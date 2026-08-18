import { Injectable } from '@nestjs/common';
import { MulterFile } from './local-storage.service';
import { S3StorageService } from './s3-storage.service';

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
    // private readonly localStorageService: LocalStorageService,
    // private readonly supabaseService: SupabaseService,
    private readonly s3StorageService: S3StorageService,
  ) {}

  async uploadFile(
    file: MulterFile,
    folder?: string,
  ): Promise<{ path: string }> {
    return await this.s3StorageService.uploadFile(file, folder);
  }

  async getPublicUrl(path: string, expieresIn?: number): Promise<string> {
    return await this.s3StorageService.getSignedUrl(path, expieresIn);
  }

  async getDownloadUrl(path: string, filename: string): Promise<string> {
    return await this.s3StorageService.getSignedDownloadUrl(path, filename);
  }

  async deleteFile(paths: string[]): Promise<void> {
    console.log('deleteFile', paths);
  }
}
