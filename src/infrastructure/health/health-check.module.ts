import { Module } from '@nestjs/common';
import { HealthCheckService } from './health-check.service';
import { CacheModule } from '@infrastructure/cache';
import { HealthController } from '@modules/health';

@Module({
  imports: [CacheModule],
  controllers: [HealthController],
  providers: [HealthCheckService],
  exports: [HealthCheckService],
})
export class HealthModule {}
