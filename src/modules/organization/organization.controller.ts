import { MaxFileSize, RequirePermission, UserId } from '@common/decorators';
import { PlatformPermissionGuard } from '@common/guards';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
} from '@nestjs/common';
import { PaginatedResponse } from '../../types';
import { CreateOrganizationDTO, UpdateOrganizationDTO } from './dto';
import { OrganizationEntity, OrganizationList } from './entities';
import {
  CreateOrganizationUseCase,
  DeleteOrganizationUseCase,
  FindAccessibleOrganizationsUseCase,
  FindAllOrganizationsUseCase,
  FindAllSelectOrganizationsUseCase,
  FindOrganizationByIdUseCase,
  UpdateOrganizationUseCase,
} from './use-cases';

@UseGuards(PlatformPermissionGuard)
@Controller('organizations')
export class OrganizationController {
  constructor(
    private readonly createOrganizationUseCase: CreateOrganizationUseCase,
    private readonly findAccessibleOrganizationsUseCase: FindAccessibleOrganizationsUseCase,
    private readonly findAllOrganizationsUseCase: FindAllOrganizationsUseCase,
    private readonly findAllSelectOrganizationsUseCase: FindAllSelectOrganizationsUseCase,
    private readonly findOrganizationByIdUseCase: FindOrganizationByIdUseCase,
    private readonly updateOrganizationUseCase: UpdateOrganizationUseCase,
    private readonly deleteOrganizationUseCase: DeleteOrganizationUseCase,
  ) {}

  @RequirePermission('organizations', 'read')
  @Get()
  async getList(): Promise<PaginatedResponse<OrganizationList>> {
    return await this.findAllOrganizationsUseCase.execute();
  }

  @RequirePermission('organizations', 'read')
  @Get('select')
  async getListSelect() {
    return await this.findAllSelectOrganizationsUseCase.execute();
  }

  @Get('accessible')
  async getAccessibleOrganizations(@UserId() userId: string) {
    return await this.findAccessibleOrganizationsUseCase.execute(userId);
  }

  @RequirePermission('organizations', 'read')
  @Get('/:id')
  async findById(
    @Param('id') id: string,
  ): Promise<Omit<OrganizationEntity, 'avatarKey'> & { avatarUrl: string }> {
    return await this.findOrganizationByIdUseCase.execute(id);
  }

  @MaxFileSize(undefined, 5)
  @RequirePermission('organizations', 'create')
  @Post()
  async create(
    @Body() dto: CreateOrganizationDTO,
    @UserId() userId: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return await this.createOrganizationUseCase.execute(dto, userId, file);
  }

  @MaxFileSize(undefined, 5)
  @RequirePermission('organizations', 'update')
  @Patch('/:id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationDTO,
    @UserId() userId: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return await this.updateOrganizationUseCase.execute(id, dto, userId, file);
  }

  @RequirePermission('organizations', 'delete')
  @Delete('/:id')
  async delete(@Param('id') id: string) {
    return await this.deleteOrganizationUseCase.execute(id);
  }
}
