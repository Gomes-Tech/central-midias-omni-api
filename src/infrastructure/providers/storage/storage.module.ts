import { Global, Module } from '@nestjs/common';
import { LocalStorageService } from './local-storage.service';
import { StorageService } from './storage.service';

@Global()
@Module({
  imports: [],
  controllers: [],
  providers: [LocalStorageService, StorageService],
  exports: [LocalStorageService, StorageService],
})
export class StorageModule {}
