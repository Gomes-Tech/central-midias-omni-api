import { NestFactory } from '@nestjs/core';
import { PrintWorkerModule } from './print-worker.module';

async function bootstrap() {
  await NestFactory.createApplicationContext(PrintWorkerModule, {
    logger: ['error', 'warn', 'log'],
  });
}

void bootstrap();
