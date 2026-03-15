import { Global, Module } from '@nestjs/common';
import { SecurityLoggerService } from './security-logger.service';
import { TokenBlacklistService } from './token-blacklist.service';

@Global()
@Module({
  providers: [SecurityLoggerService, TokenBlacklistService],
  exports: [SecurityLoggerService, TokenBlacklistService],
})
export class SecurityModule {}
