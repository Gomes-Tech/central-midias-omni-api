import {
  AllowedFileTypes,
  MaxFileSize,
  RequirePermission,
  UserId,
} from '@common/decorators';
import { PlatformPermissionGuard } from '@common/guards';
import { BadRequestException } from '@common/filters';
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UploadedFiles,
  UseGuards,
} from '@nestjs/common';
import {
  ArchivePrintColorProfileDTO,
  CreatePrintColorProfileDTO,
} from '../dto';
import { PrintColorProfileService } from '../services/print-color-profile.service';

@UseGuards(PlatformPermissionGuard)
@Controller('admin/print-color-profiles')
export class PrintColorProfileController {
  constructor(private readonly service: PrintColorProfileService) {}

  @RequirePermission('print-profiles', 'read')
  @Get()
  list() {
    return this.service.list();
  }

  @MaxFileSize(undefined, 5)
  @AllowedFileTypes({
    extensions: ['icc', 'icm'],
    mimeTypes: ['application/vnd.iccprofile', 'application/octet-stream'],
    description: 'ICC/ICM',
  })
  @RequirePermission('print-profiles', 'create')
  @Post()
  create(
    @Body() dto: CreatePrintColorProfileDTO,
    @UploadedFiles() files: Express.Multer.File[] | undefined,
    @UserId() userId: string,
  ) {
    const file = Array.isArray(files) ? files[0] : undefined;
    if (!file || file.fieldname !== 'file' || files?.length !== 1) {
      throw new BadRequestException('Envie um perfil no campo file');
    }
    return this.service.create(dto, file, userId);
  }

  @RequirePermission('print-profiles', 'update')
  @Patch(':id')
  setActive(
    @Param('id') id: string,
    @Body() dto: ArchivePrintColorProfileDTO,
    @UserId() userId: string,
  ) {
    return this.service.setActive(id, dto.isActive, userId);
  }
}
