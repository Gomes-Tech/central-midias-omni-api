import { Controller, Get, Header } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { Public } from '@common/decorators';

@Public()
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  async getMetrics(): Promise<string> {
    const metrics = await this.metricsService.getMetrics();
    return metrics;
  }
}
