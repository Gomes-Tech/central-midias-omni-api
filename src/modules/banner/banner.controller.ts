import {
  MaxFileSize,
  OrgId,
  RequirePermission,
  UserId,
} from '@common/decorators';
import { PlatformPermissionGuard } from '@common/guards';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
} from '@nestjs/common';
import { CreateBannerDTO } from './dto/create-banner.dto';
import { UpdateBannerDTO } from './dto/update-banner.dto';
import { CreateBannerUseCase } from './use-cases/create-banner.use-case';
import { DeleteBannerUseCase } from './use-cases/delete-banner.use-case';
import { GetBannerUseCase } from './use-cases/get-banner.use-case';
import { ListBannersUseCase } from './use-cases/list-banners.use-case';
import { UpdateBannerUseCase } from './use-cases/update-banner.use-case';

type UploadedBannerFiles =
  | Express.Multer.File[]
  | Record<string, Express.Multer.File[] | Express.Multer.File | undefined>
  | undefined;

@UseGuards(PlatformPermissionGuard)
@Controller('banners')
export class BannerController {
  constructor(
    private readonly createBannerUseCase: CreateBannerUseCase,
    private readonly listBannersUseCase: ListBannersUseCase,
    private readonly getBannerUseCase: GetBannerUseCase,
    private readonly updateBannerUseCase: UpdateBannerUseCase,
    private readonly deleteBannerUseCase: DeleteBannerUseCase,
  ) {}

  private getFile(
    files: UploadedBannerFiles,
    fieldNames: string[],
  ): Express.Multer.File | undefined {
    if (!files) {
      return undefined;
    }

    if (Array.isArray(files)) {
      return files.find((file) => fieldNames.includes(file.fieldname));
    }

    for (const fieldName of fieldNames) {
      const file = files[fieldName];
      if (Array.isArray(file)) {
        return file[0];
      }
      if (file) {
        return file;
      }
    }

    return undefined;
  }

  @RequirePermission('banners', 'read')
  @Get()
  async list(
    @OrgId() organizationId: string,
    @Query('referenceDate') referenceDate?: string,
  ) {
    return await this.listBannersUseCase.execute(organizationId, referenceDate);
  }

  @Get('/list')
  async listWeb(@OrgId() organizationId: string) {
    return await this.listBannersUseCase.execute(
      organizationId,
      new Date().toISOString(),
    );
  }

  @RequirePermission('banners', 'read')
  @Get(':id')
  async getById(@Param('id') id: string, @OrgId() organizationId: string) {
    return await this.getBannerUseCase.execute(id, organizationId);
  }

  @MaxFileSize(undefined, 5)
  @RequirePermission('banners', 'create')
  @Post()
  async create(
    @OrgId() organizationId: string,
    @Body() dto: CreateBannerDTO,
    @UserId() userId: string,
    @UploadedFiles() files: UploadedBannerFiles,
  ) {
    const desktop = this.getFile(files, ['desktopImage', 'desktop']);
    const mobile = this.getFile(files, ['mobileImage', 'mobile']);

    await this.createBannerUseCase.execute(organizationId, dto, userId, {
      desktop,
      mobile,
    });
  }

  @MaxFileSize(undefined, 5)
  @RequirePermission('banners', 'update')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @OrgId() organizationId: string,
    @Body() dto: UpdateBannerDTO,
    @UserId() userId: string,
    @UploadedFiles()
    files?: UploadedBannerFiles,
  ) {
    const desktopImage = this.getFile(files, ['desktopImage', 'desktop']);
    const mobileImage = this.getFile(files, ['mobileImage', 'mobile']);

    await this.updateBannerUseCase.execute(id, organizationId, dto, userId, {
      desktopImage,
      mobileImage,
    });
  }

  @RequirePermission('banners', 'delete')
  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @OrgId() organizationId: string,
    @UserId() userId: string,
  ) {
    await this.deleteBannerUseCase.execute(id, organizationId, userId);
  }
}
