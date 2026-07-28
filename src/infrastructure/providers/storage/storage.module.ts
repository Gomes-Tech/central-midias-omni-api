import { Global, InternalServerErrorException, Module } from '@nestjs/common';
import { LocalStorageService } from './local-storage.service';
import { S3StorageService } from './s3-storage.service';
import { STORAGE_PROVIDER, type StorageProvider } from './storage-provider';
import { StorageService } from './storage.service';
import { SupabaseService } from './supabase.service';

function createStorageProvider(): StorageProvider {
  const provider = (process.env.STORAGE_PROVIDER ?? 'supabase').toLowerCase();

  if (provider === 'supabase') {
    return new SupabaseService();
  }

  if (provider === 's3') {
    return new S3StorageService();
  }

  throw new InternalServerErrorException(
    `Storage provider inválido: ${provider}`,
  );
}

@Global()
@Module({
  imports: [],
  controllers: [],
  providers: [
    LocalStorageService,
    StorageService,
    {
      provide: STORAGE_PROVIDER,
      useFactory: createStorageProvider,
    },
  ],
  exports: [LocalStorageService, StorageService, STORAGE_PROVIDER],
})
export class StorageModule {}
