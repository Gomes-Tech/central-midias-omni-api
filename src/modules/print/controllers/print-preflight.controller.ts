import { OrgId, RequirePermission } from '@common/decorators';
import { PlatformPermissionGuard } from '@common/guards';
import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { PrintPreflightService } from '../services/print-preflight.service';

@UseGuards(PlatformPermissionGuard)
@Controller('materials/:id/template/print-preflight')
export class PrintPreflightController {
  constructor(private readonly service: PrintPreflightService) {}

  @RequirePermission('materials', 'read')
  @Get()
  get(@Param('id') materialId: string, @OrgId() organizationId: string) {
    return this.service.get(materialId, organizationId);
  }

  @RequirePermission('materials', 'update')
  @Post()
  run(@Param('id') materialId: string, @OrgId() organizationId: string) {
    return this.service.run(materialId, organizationId);
  }
}
