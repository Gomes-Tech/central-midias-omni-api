import { RedisModule } from '@infrastructure/redis';
import { Global, Module } from '@nestjs/common';
import { SecurityLoggerService } from './security-logger.service';
import { TokenBlacklistService } from './token-blacklist.service';

@Global()
@Module({
  imports: [RedisModule],
  providers: [SecurityLoggerService, TokenBlacklistService],
  exports: [SecurityLoggerService, TokenBlacklistService],
})
export class SecurityModule {}
