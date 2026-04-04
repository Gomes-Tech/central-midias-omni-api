import { Test } from '@nestjs/testing';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';

describe('MetricsController', () => {
  it('getMetrics deve retornar texto do MetricsService', async () => {
    const metricsService = {
      getMetrics: jest.fn().mockResolvedValue('# metrics'),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [MetricsController],
      providers: [
        { provide: MetricsService, useValue: metricsService },
      ],
    }).compile();

    const controller = moduleRef.get(MetricsController);
    await expect(controller.getMetrics()).resolves.toBe('# metrics');
    expect(metricsService.getMetrics).toHaveBeenCalled();
  });
});
