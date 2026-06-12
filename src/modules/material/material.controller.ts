import { OrgId, RequirePermission, UserId } from '@common/decorators';
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
import { PaginatedResponse } from '../../types';
import {
  CreateMaterialDTO,
  FindAllMaterialsFiltersDTO,
  SearchMaterialsFiltersDTO,
  UpdateMaterialDTO,
} from './dto';
import { MaterialListItem } from './entities';
import {
  CreateMaterialUseCase,
  DeleteMaterialFileUseCase,
  DeleteMaterialUseCase,
  FindAllMaterialsUseCase,
  FindMaterialByIdUseCase,
  FindMaterialFilesUseCase,
  SearchMaterialsUseCase,
  UpdateMaterialUseCase,
  UploadMaterialFilesUseCase,
} from './use-cases';

type UploadedMaterialFiles =
  | Express.Multer.File[]
  | Record<string, Express.Multer.File[] | Express.Multer.File | undefined>
  | undefined;

@UseGuards(PlatformPermissionGuard)
@Controller('materials')
export class MaterialController {
  constructor(
    private readonly findAllMaterialsUseCase: FindAllMaterialsUseCase,
    private readonly searchMaterialsUseCase: SearchMaterialsUseCase,
    private readonly findMaterialByIdUseCase: FindMaterialByIdUseCase,
    private readonly createMaterialUseCase: CreateMaterialUseCase,
    private readonly updateMaterialUseCase: UpdateMaterialUseCase,
    private readonly deleteMaterialUseCase: DeleteMaterialUseCase,
    private readonly uploadMaterialFilesUseCase: UploadMaterialFilesUseCase,
    private readonly findMaterialFilesUseCase: FindMaterialFilesUseCase,
    private readonly deleteMaterialFileUseCase: DeleteMaterialFileUseCase,
  ) {}

  private getFiles(files: UploadedMaterialFiles): Express.Multer.File[] {
    if (!files) {
      return [];
    }

    if (Array.isArray(files)) {
      return files;
    }

    return Object.values(files)
      .flatMap((file) => (Array.isArray(file) ? file : [file]))
      .filter(Boolean) as Express.Multer.File[];
  }

  @RequirePermission('materials', 'read')
  @Get()
  async findAll(
    @OrgId() organizationId: string,
    @Query() filters: FindAllMaterialsFiltersDTO = {},
  ) {
    return await this.findAllMaterialsUseCase.execute(organizationId, filters);
  }

  @Get('search')
  async search(
    @OrgId() organizationId: string,
    @UserId() userId: string,
    @Query() filters: SearchMaterialsFiltersDTO = {},
  ): Promise<PaginatedResponse<MaterialListItem>> {
    return await this.searchMaterialsUseCase.execute(
      organizationId,
      userId,
      filters,
    );
  }

  @RequirePermission('materials', 'read')
  @Get(':id')
  async findById(@Param('id') id: string, @OrgId() organizationId: string) {
    return await this.findMaterialByIdUseCase.execute(id, organizationId);
  }

  @RequirePermission('materials', 'read')
  @Get(':id/files')
  async findFiles(@Param('id') id: string, @OrgId() organizationId: string) {
    return await this.findMaterialFilesUseCase.execute(id, organizationId);
  }

  @RequirePermission('materials', 'create')
  @Post()
  async create(
    @Body() dto: CreateMaterialDTO,
    @OrgId() organizationId: string,
    @UserId() userId: string,
    @UploadedFiles() files: UploadedMaterialFiles,
  ) {
    await this.createMaterialUseCase.execute(
      organizationId,
      dto,
      userId,
      this.getFiles(files),
    );
  }

  @RequirePermission('materials', 'update')
  @Post(':id/files')
  async uploadFiles(
    @Param('id') id: string,
    @OrgId() organizationId: string,
    @UploadedFiles() files: UploadedMaterialFiles,
    @UserId() userId: string,
  ) {
    return await this.uploadMaterialFilesUseCase.execute(
      id,
      organizationId,
      this.getFiles(files),
      userId,
    );
  }

  @RequirePermission('materials', 'update')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateMaterialDTO,
    @OrgId() organizationId: string,
    @UserId() userId: string,
  ) {
    await this.updateMaterialUseCase.execute(id, organizationId, dto, userId);
  }

  @RequirePermission('materials', 'delete')
  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @OrgId() organizationId: string,
    @UserId() userId: string,
  ) {
    await this.deleteMaterialUseCase.execute(id, organizationId, userId);
  }

  @RequirePermission('materials', 'update')
  @Delete(':id/files/:fileId')
  async deleteFile(
    @Param('id') id: string,
    @Param('fileId') fileId: string,
    @OrgId() organizationId: string,
    @UserId() userId: string,
  ) {
    await this.deleteMaterialFileUseCase.execute(
      id,
      fileId,
      organizationId,
      userId,
    );
  }
}
