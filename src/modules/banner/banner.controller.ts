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

@Controller('banners')
export class BannerController {
  constructor(
    private readonly createBannerUseCase: CreateBannerUseCase,
    private readonly listBannersUseCase: ListBannersUseCase,
    private readonly getBannerUseCase: GetBannerUseCase,
    private readonly updateBannerUseCase: UpdateBannerUseCase,
    private readonly deleteBannerUseCase: DeleteBannerUseCase,
  ) {}

  @UseGuards(PlatformPermissionGuard)
  @RequirePermission('banners', 'read')
  @Get()
  async list(
    @OrgId() organizationId: string,
    @Query('referenceDate') referenceDate?: string,
  ) {
    return await this.listBannersUseCase.execute(organizationId, referenceDate);
  }

  @Get(':id')
  async getById(@Param('id') id: string, @OrgId() organizationId: string) {
    return await this.getBannerUseCase.execute(id, organizationId);
  }

  @UseGuards(PlatformPermissionGuard)
  @MaxFileSize(undefined, 5)
  @RequirePermission('banners', 'create')
  @Post()
  async create(
    @OrgId() organizationId: string,
    @Body() dto: CreateBannerDTO,
    @UserId() userId: string,
    @UploadedFiles()
    files?: {
      mobileImage?: Express.Multer.File[];
      desktopImage?: Express.Multer.File[];
    },
  ) {
    // A seguinte linha foi comentada porque não estava de acordo com a assinatura o execute do use case:
    // await this.createBannerUseCase.execute(organizationId, dto, userId, files);

    // No lugar dela, usei o seguinte:
    await this.createBannerUseCase.execute(organizationId, dto, userId, {
      mobile: files?.mobileImage?.[0],
      desktop: files?.desktopImage?.[0],
    });
  }

  @UseGuards(PlatformPermissionGuard)
  @MaxFileSize(undefined, 5)
  @RequirePermission('banners', 'update')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @OrgId() organizationId: string,
    @Body() dto: UpdateBannerDTO,
    @UserId() userId: string,
    @UploadedFiles()
    files?: {
      mobileImage?: Express.Multer.File[];
      desktopImage?: Express.Multer.File[];
    },
  ) {
    await this.updateBannerUseCase.execute(
      id,
      organizationId,
      dto,
      userId,
      files,
    );
  }

  @UseGuards(PlatformPermissionGuard)
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
