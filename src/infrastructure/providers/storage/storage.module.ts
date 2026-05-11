import { Global, Module } from '@nestjs/common';
import { LocalStorageService } from './local-storage.service';
import { S3StorageService } from './s3-storage.service';
import { StorageService } from './storage.service';
import { SupabaseService } from './supabase.service';

@Global()
@Module({
  imports: [],
  controllers: [],
  providers: [
    LocalStorageService,
    StorageService,
    S3StorageService,
    SupabaseService,
  ],
  exports: [
    LocalStorageService,
    StorageService,
    S3StorageService,
    SupabaseService,
  ],
})
export class StorageModule {}
