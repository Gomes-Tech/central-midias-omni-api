import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import {
  MATERIAL_ACCEPTANCE_EMAIL_QUEUE,
  MATERIAL_ACCEPTANCE_EMAIL_QUEUE_OPTIONS,
  MATERIAL_ACCEPTANCE_EXPORT_QUEUE,
  MATERIAL_ACCEPTANCE_EXPORT_QUEUE_OPTIONS,
  MATERIAL_NOTIFICATION_EMAIL_QUEUE,
  MATERIAL_NOTIFICATION_EMAIL_QUEUE_OPTIONS,
  REPORT_EXPORT_QUEUE,
  REPORT_EXPORT_QUEUE_OPTIONS,
  PRINT_EXPORT_QUEUE,
  PRINT_EXPORT_QUEUE_OPTIONS,
  PRINT_PREFLIGHT_QUEUE,
  PRINT_PREFLIGHT_QUEUE_OPTIONS,
  IN_APP_NOTIFICATION_QUEUE,
  IN_APP_NOTIFICATION_QUEUE_OPTIONS,
} from './queue.constants';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('redis.host', 'localhost'),
          port: configService.get<number>('redis.port', 6379),
          ...(configService.get<string>('redis.password') && {
            password: configService.get<string>('redis.password'),
          }),
        },
      }),
    }),
    BullModule.registerQueue({
      name: MATERIAL_ACCEPTANCE_EMAIL_QUEUE,
      defaultJobOptions: MATERIAL_ACCEPTANCE_EMAIL_QUEUE_OPTIONS,
    }),
    BullModule.registerQueue({
      name: MATERIAL_ACCEPTANCE_EXPORT_QUEUE,
      defaultJobOptions: MATERIAL_ACCEPTANCE_EXPORT_QUEUE_OPTIONS,
    }),
    BullModule.registerQueue({
      name: MATERIAL_NOTIFICATION_EMAIL_QUEUE,
      defaultJobOptions: MATERIAL_NOTIFICATION_EMAIL_QUEUE_OPTIONS,
    }),
    BullModule.registerQueue({
      name: REPORT_EXPORT_QUEUE,
      defaultJobOptions: REPORT_EXPORT_QUEUE_OPTIONS,
    }),
    BullModule.registerQueue({
      name: PRINT_EXPORT_QUEUE,
      defaultJobOptions: PRINT_EXPORT_QUEUE_OPTIONS,
    }),
    BullModule.registerQueue({
      name: PRINT_PREFLIGHT_QUEUE,
      defaultJobOptions: PRINT_PREFLIGHT_QUEUE_OPTIONS,
    }),
    BullModule.registerQueue({
      name: IN_APP_NOTIFICATION_QUEUE,
      defaultJobOptions: IN_APP_NOTIFICATION_QUEUE_OPTIONS,
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
