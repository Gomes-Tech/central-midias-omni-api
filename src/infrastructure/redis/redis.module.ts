import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { RedisClientLifecycle } from './redis-client.lifecycle';
import { REDIS_CLIENT } from './redis.constants';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const password = configService.get<string>('redis.password');

        return new Redis({
          host: configService.get<string>('redis.host', 'localhost'),
          port: configService.get<number>('redis.port', 6379),
          ...(password ? { password } : {}),
          maxRetriesPerRequest: 1,
          enableOfflineQueue: false,
        });
      },
    },
    RedisClientLifecycle,
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
