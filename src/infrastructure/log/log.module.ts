import { Global, Module } from '@nestjs/common';
import { LogRepository } from './log.repository';
import { LoggerService } from './logger.service';

@Global()
@Module({
  providers: [LogRepository, LoggerService],
  exports: [LoggerService],
})
export class LogModule {}
