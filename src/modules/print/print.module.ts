import { PlatformPermissionGuard } from '@common/guards';
import { MaterialModule } from '@modules/material';
import { MaterialTemplateModule } from '@modules/material-template/material-template.module';
import { forwardRef, Module } from '@nestjs/common';
import { PrintColorProfileController } from './controllers/print-color-profile.controller';
import { PrintExportController } from './controllers/print-export.controller';
import { PrintPreflightController } from './controllers/print-preflight.controller';
import { PrintPresetController } from './controllers/print-preset.controller';
import { PrintColorProfileService } from './services/print-color-profile.service';
import { PrintDocumentService } from './services/print-document.service';
import { PrintExportService } from './services/print-export.service';
import { PrintPreflightService } from './services/print-preflight.service';
import { PrintPresetService } from './services/print-preset.service';
import { PrintRendererService } from './services/print-renderer.service';

@Module({
  imports: [forwardRef(() => MaterialTemplateModule), MaterialModule],
  controllers: [
    PrintColorProfileController,
    PrintPresetController,
    PrintPreflightController,
    PrintExportController,
  ],
  providers: [
    PlatformPermissionGuard,
    PrintColorProfileService,
    PrintPresetService,
    PrintPreflightService,
    PrintDocumentService,
    PrintExportService,
    PrintRendererService,
  ],
  exports: [
    PrintPreflightService,
    PrintRendererService,
    PrintExportService,
  ],
})
export class PrintModule {}
