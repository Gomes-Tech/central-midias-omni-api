import { Injectable } from '@nestjs/common';
import { MulterFile } from './local-storage.service';
import { SupabaseService } from './supabase.service';

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
    private readonly supabaseService: SupabaseService,
  ) {}

  async uploadFile(
    file: MulterFile,
    folder?: string,
  ): Promise<{ path: string }> {
    return await this.supabaseService.uploadFile(file, folder);
  }

  async getPublicUrl(path: string) {
    return await this.supabaseService.getSignedUrl(path);
  }

  async deleteFile(paths: string[]): Promise<void> {
    console.log('deleteFile', paths);
  }
}
