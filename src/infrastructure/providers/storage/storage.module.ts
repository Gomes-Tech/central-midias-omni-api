import { Global, Module } from '@nestjs/common';
import { LocalStorageService } from './local-storage.service';
import { StorageService } from './storage.service';
import { SupabaseService } from './supabase.service';

@Global()
@Module({
  imports: [],
  controllers: [],
  providers: [LocalStorageService, StorageService, SupabaseService],
  exports: [LocalStorageService, StorageService, SupabaseService],
})
export class StorageModule {}
