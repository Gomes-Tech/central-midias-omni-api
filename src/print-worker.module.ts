import { ConfigModule } from '@infrastructure/config';
import { LogModule } from '@infrastructure/log';
import { PrismaModule } from '@infrastructure/prisma';
import { StorageModule } from '@infrastructure/providers';
import { QueueModule } from '@infrastructure/queue';
import { PrintModule } from '@modules/print';
import { Module } from '@nestjs/common';
import { PrintExportProcessor } from './modules/print/queue/print-export.processor';
import { PrintPreflightProcessor } from './modules/print/queue/print-preflight.processor';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    LogModule,
    StorageModule,
    QueueModule,
    PrintModule,
  ],
  providers: [PrintExportProcessor, PrintPreflightProcessor],
})
export class PrintWorkerModule {}
