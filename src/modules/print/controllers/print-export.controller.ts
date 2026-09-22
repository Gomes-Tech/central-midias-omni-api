import { MaxFileSize, OrgId, UserId } from '@common/decorators';
import { PRINT_IMAGE_MAX_BYTES } from '@common/constants/print-image-limits';
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFiles,
} from '@nestjs/common';
import { CreatePrintExportDTO } from '../dto';
import { PrintExportService } from '../services/print-export.service';

@Controller()
export class PrintExportController {
  constructor(private readonly service: PrintExportService) {}

  // O interceptor global usaria 5 MiB por padrão e barraria as fotos de
  // impressão, que agora podem chegar a 30 MiB.
  @MaxFileSize(PRINT_IMAGE_MAX_BYTES)
  @Post('materials/:id/print-exports')
  create(
    @Param('id') materialId: string,
    @OrgId() organizationId: string,
    @UserId() userId: string,
    @Body() dto: CreatePrintExportDTO,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.service.create(
      materialId,
      organizationId,
      userId,
      dto,
      files ?? [],
    );
  }

  @Get('print-exports/:id')
  get(
    @Param('id') id: string,
    @OrgId() organizationId: string,
    @UserId() userId: string,
  ) {
    return this.service.get(id, organizationId, userId);
  }

  @Get('print-exports/:id/download')
  download(
    @Param('id') id: string,
    @OrgId() organizationId: string,
    @UserId() userId: string,
  ) {
    return this.service.download(id, organizationId, userId);
  }
}
