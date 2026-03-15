import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { MetricsService } from '../metrics/metrics.service';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(@Optional() private readonly metricsService?: MetricsService) {
    super({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
      log:
        process.env.NODE_ENV === 'dev' ? ['query', 'error', 'warn'] : ['error'],
    });
  }

  async onModuleInit() {
    await this.$connect();

    if (this.metricsService) {
      return this.$extends({
        query: {
          $allModels: {
            async $allOperations({ model, operation, args, query }) {
              const start = Date.now();

              try {
                const result = await query(args);
                const duration = (Date.now() - start) / 1000;

                this.metricsService.recordDbQuery(
                  operation,
                  model ?? 'unknown',
                  duration,
                  true,
                );

                return result;
              } catch (error) {
                const duration = (Date.now() - start) / 1000;

                this.metricsService.recordDbQuery(
                  operation,
                  model ?? 'unknown',
                  duration,
                  false,
                );

                throw error;
              }
            },
          },
        },
      });
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
