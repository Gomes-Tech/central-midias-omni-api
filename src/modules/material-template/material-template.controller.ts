import {
  AllowedFileTypes,
  MaxFileSize,
  OrgId,
  RequirePermission,
  UserId,
} from '@common/decorators';
import { PlatformPermissionGuard } from '@common/guards';
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UploadedFiles,
  UseGuards,
} from '@nestjs/common';
import { PublishMaterialTemplateDTO, SaveMaterialTemplateDTO } from './dto';
import {
  GetAdminMaterialTemplateUseCase,
  GetPublishedMaterialTemplateUseCase,
  PublishMaterialTemplateUseCase,
  ReplaceMaterialTemplateBaseUseCase,
  SaveMaterialTemplateUseCase,
} from './use-cases';

type UploadedTemplateFiles =
  | Express.Multer.File[]
  | Record<string, Express.Multer.File[] | Express.Multer.File | undefined>
  | undefined;

@UseGuards(PlatformPermissionGuard)
@Controller('materials')
export class MaterialTemplateController {
  constructor(
    private readonly getAdminUseCase: GetAdminMaterialTemplateUseCase,
    private readonly getPublishedUseCase: GetPublishedMaterialTemplateUseCase,
    private readonly saveUseCase: SaveMaterialTemplateUseCase,
    private readonly publishUseCase: PublishMaterialTemplateUseCase,
    private readonly replaceBaseUseCase: ReplaceMaterialTemplateBaseUseCase,
  ) {}

  private getFiles(files: UploadedTemplateFiles): Express.Multer.File[] {
    if (!files) return [];
    if (Array.isArray(files)) return files.filter(Boolean);
    return Object.values(files)
      .flatMap((file) => (Array.isArray(file) ? file : [file]))
      .filter(Boolean) as Express.Multer.File[];
  }

  @RequirePermission('materials', 'read')
  @Get(':id/template')
  async getAdmin(
    @Param('id') materialId: string,
    @OrgId() organizationId: string,
  ) {
    return await this.getAdminUseCase.execute(materialId, organizationId);
  }

  @Get(':id/customization-template')
  async getPublished(
    @Param('id') materialId: string,
    @OrgId() organizationId: string,
    @UserId() userId: string,
  ) {
    return await this.getPublishedUseCase.execute(
      materialId,
      organizationId,
      userId,
    );
  }

  @RequirePermission('materials', 'update')
  @Put(':id/template')
  async save(
    @Param('id') materialId: string,
    @OrgId() organizationId: string,
    @UserId() userId: string,
    @Body() dto: SaveMaterialTemplateDTO,
  ) {
    return await this.saveUseCase.execute(
      materialId,
      organizationId,
      userId,
      dto,
    );
  }

  @RequirePermission('materials', 'update')
  @Post(':id/template/publish')
  async publish(
    @Param('id') materialId: string,
    @OrgId() organizationId: string,
    @UserId() userId: string,
    @Body() dto: PublishMaterialTemplateDTO,
  ) {
    return await this.publishUseCase.execute(
      materialId,
      organizationId,
      userId,
      dto,
    );
  }

  @MaxFileSize(undefined, 5)
  @AllowedFileTypes({
    extensions: ['png', 'jpg', 'jpeg'],
    mimeTypes: ['image/png', 'image/jpeg', 'image/jpg'],
    description: 'PNG e JPG/JPEG',
  })
  @RequirePermission('materials', 'update')
  @Put(':id/base-image')
  async replaceBase(
    @Param('id') materialId: string,
    @OrgId() organizationId: string,
    @UserId() userId: string,
    @UploadedFiles() files?: UploadedTemplateFiles,
  ) {
    return await this.replaceBaseUseCase.execute(
      materialId,
      organizationId,
      userId,
      this.getFiles(files),
    );
  }
}
