import { OrgId, RequirePermission, UserId } from '@common/decorators';
import { PlatformPermissionGuard } from '@common/guards';
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { SavePrintPresetDTO } from '../dto';
import { PrintPresetService } from '../services/print-preset.service';

@UseGuards(PlatformPermissionGuard)
@Controller('print-presets')
export class PrintPresetController {
  constructor(private readonly service: PrintPresetService) {}

  @RequirePermission('materials', 'read')
  @Get()
  list(@OrgId() organizationId: string) {
    return this.service.list(organizationId);
  }

  @RequirePermission('materials', 'read')
  @Get('available-color-profiles')
  listAvailableColorProfiles() {
    return this.service.listAvailableColorProfiles();
  }

  @RequirePermission('materials', 'read')
  @Get(':id')
  get(@Param('id') id: string, @OrgId() organizationId: string) {
    return this.service.get(id, organizationId);
  }

  @RequirePermission('materials', 'update')
  @Post()
  create(
    @OrgId() organizationId: string,
    @UserId() userId: string,
    @Body() dto: SavePrintPresetDTO,
  ) {
    return this.service.create(organizationId, dto, userId);
  }

  @RequirePermission('materials', 'update')
  @Put(':id')
  update(
    @Param('id') id: string,
    @OrgId() organizationId: string,
    @UserId() userId: string,
    @Body() dto: SavePrintPresetDTO,
  ) {
    return this.service.update(id, organizationId, dto, userId);
  }

  @RequirePermission('materials', 'update')
  @Patch(':id/archive')
  archive(
    @Param('id') id: string,
    @OrgId() organizationId: string,
    @UserId() userId: string,
  ) {
    return this.service.archive(id, organizationId, userId);
  }
}
