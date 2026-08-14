import { OrgId, UserId } from '@common/decorators';
import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CreatePrintExportDTO } from '../dto';
import { PrintExportService } from '../services/print-export.service';

@Controller()
export class PrintExportController {
  constructor(private readonly service: PrintExportService) {}

  @Post('materials/:id/print-exports')
  create(
    @Param('id') materialId: string,
    @OrgId() organizationId: string,
    @UserId() userId: string,
    @Body() dto: CreatePrintExportDTO,
  ) {
    return this.service.create(materialId, organizationId, userId, dto);
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
