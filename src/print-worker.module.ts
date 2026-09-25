import { ConfigModule } from '@infrastructure/config';
import { LogModule } from '@infrastructure/log';
import { PrismaModule } from '@infrastructure/prisma';
import { StorageModule } from '@infrastructure/providers';
import { QueueModule } from '@infrastructure/queue';
import { MaterialRepository } from '@modules/material/repository';
import { MaterialTemplateDocumentService } from '@modules/material-template/services/material-template-document.service';
import { Module } from '@nestjs/common';
import { PrintExportProcessor } from './modules/print/queue/print-export.processor';
import { PrintPreflightProcessor } from './modules/print/queue/print-preflight.processor';
import { PrintDocumentService } from './modules/print/services/print-document.service';
import { PrintExportService } from './modules/print/services/print-export.service';
import { PrintPreflightService } from './modules/print/services/print-preflight.service';
import { PrintRendererService } from './modules/print/services/print-renderer.service';
import { PrintImageInputService } from './modules/print/services/print-image-input.service';

@Module({
  imports: [ConfigModule, PrismaModule, LogModule, StorageModule, QueueModule],
  providers: [
    MaterialRepository,
    MaterialTemplateDocumentService,
    PrintDocumentService,
    PrintPreflightService,
    PrintRendererService,
    PrintImageInputService,
    PrintExportService,
    PrintExportProcessor,
    PrintPreflightProcessor,
  ],
})
export class PrintWorkerModule {}
