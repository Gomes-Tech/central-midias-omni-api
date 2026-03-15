import { Global, Module } from '@nestjs/common';
import { LocalStorageService } from './local-storage.service';

@Global()
@Module({
  imports: [],
  controllers: [],
  providers: [LocalStorageService],
  exports: [LocalStorageService],
})
export class StorageModule {}
