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
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
} from '@nestjs/common';
import {
  ASSET_FILE_TYPES_POLICY,
  ASSET_UPLOAD_MAX_SIZE_MB,
} from './asset.constants';
import { FindAllAssetsFiltersDTO, UpdateAssetDTO } from './dto';
import {
  CreateAssetsUseCase,
  DeleteAssetUseCase,
  FindAllAssetsUseCase,
  GetAssetUseCase,
  UpdateAssetUseCase,
} from './use-cases';

type UploadedAssetFiles =
  | Express.Multer.File[]
  | Record<string, Express.Multer.File[] | Express.Multer.File | undefined>
  | undefined;

@UseGuards(PlatformPermissionGuard)
@Controller('assets')
export class AssetController {
  constructor(
    private readonly findAllAssetsUseCase: FindAllAssetsUseCase,
    private readonly getAssetUseCase: GetAssetUseCase,
    private readonly createAssetsUseCase: CreateAssetsUseCase,
    private readonly updateAssetUseCase: UpdateAssetUseCase,
    private readonly deleteAssetUseCase: DeleteAssetUseCase,
  ) {}

  private getFiles(files: UploadedAssetFiles): Express.Multer.File[] {
    if (!files) return [];
    if (Array.isArray(files)) return files.filter(Boolean);
    return Object.values(files)
      .flatMap((file) => (Array.isArray(file) ? file : [file]))
      .filter(Boolean) as Express.Multer.File[];
  }

  @RequirePermission('assets', 'read')
  @Get()
  async findAll(
    @OrgId() organizationId: string,
    @Query() filters: FindAllAssetsFiltersDTO = {},
  ) {
    return await this.findAllAssetsUseCase.execute(organizationId, filters);
  }

  @RequirePermission('assets', 'read')
  @Get(':id')
  async findById(@Param('id') id: string, @OrgId() organizationId: string) {
    return await this.getAssetUseCase.execute(id, organizationId);
  }

  @MaxFileSize(undefined, ASSET_UPLOAD_MAX_SIZE_MB)
  @AllowedFileTypes(ASSET_FILE_TYPES_POLICY)
  @RequirePermission('assets', 'create')
  @Post()
  async create(
    @OrgId() organizationId: string,
    @UserId() userId: string,
    @UploadedFiles() files?: UploadedAssetFiles,
  ) {
    return await this.createAssetsUseCase.execute(
      organizationId,
      this.getFiles(files),
      userId,
    );
  }

  @MaxFileSize(undefined, ASSET_UPLOAD_MAX_SIZE_MB)
  @AllowedFileTypes(ASSET_FILE_TYPES_POLICY)
  @RequirePermission('assets', 'update')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @OrgId() organizationId: string,
    @Body() dto: UpdateAssetDTO = {},
    @UserId() userId: string,
    @UploadedFiles() files?: UploadedAssetFiles,
  ) {
    return await this.updateAssetUseCase.execute(
      id,
      organizationId,
      dto,
      this.getFiles(files),
      userId,
    );
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('assets', 'delete')
  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @OrgId() organizationId: string,
    @UserId() userId: string,
  ) {
    await this.deleteAssetUseCase.execute(id, organizationId, userId);
  }
}
