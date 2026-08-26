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
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UploadedFiles,
  UseGuards,
} from '@nestjs/common';
import {
  ArchivePrintColorProfileDTO,
  CreatePrintColorProfileDTO,
  UpdatePrintColorProfileDTO,
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

  @RequirePermission('print-profiles', 'read')
  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.get(id);
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
  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePrintColorProfileDTO,
    @UserId() userId: string,
  ) {
    return this.service.update(id, dto, userId);
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

  @RequirePermission('print-profiles', 'delete')
  @Delete(':id')
  remove(@Param('id') id: string, @UserId() userId: string) {
    return this.service.remove(id, userId);
  }
}
