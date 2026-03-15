import { Global, Module } from '@nestjs/common';
import { MetricsModule } from '../metrics/metrics.module';
import { CircuitBreakerService } from './circuit-breaker.service';

@Global()
@Module({
  imports: [MetricsModule],
  providers: [CircuitBreakerService],
  exports: [CircuitBreakerService],
})
export class CircuitBreakerModule {}
