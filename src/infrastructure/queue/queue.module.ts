import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import {
  MATERIAL_ACCEPTANCE_EMAIL_QUEUE,
  MATERIAL_ACCEPTANCE_EMAIL_QUEUE_OPTIONS,
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
  ],
  exports: [BullModule],
})
export class QueueModule {}
