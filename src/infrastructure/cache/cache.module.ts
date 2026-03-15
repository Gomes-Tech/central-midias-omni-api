import { CacheModule as Cache } from '@nestjs/cache-manager';
import { Global, Module } from '@nestjs/common';
import { CacheService } from './cache.service';

@Global()
@Module({
  imports: [Cache.register()],
  controllers: [],
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}
