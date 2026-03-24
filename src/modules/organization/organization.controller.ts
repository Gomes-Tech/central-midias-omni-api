import { MaxFileSize, RequirePermission } from '@common/decorators';
import { TenantAccessGuard, TenantPermissionGuard } from '@common/guards';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CreateOrganizationDTO, UpdateOrganizationDTO } from './dto';
import {
  CreateOrganizationUseCase,
  DeleteOrganizationUseCase,
  FindAllOrganizationsUseCase,
  FindOrganizationByIdUseCase,
  UpdateOrganizationUseCase,
} from './use-cases';

@Controller('organizations')
export class OrganizationController {
  constructor(
    private readonly createOrganizationUseCase: CreateOrganizationUseCase,
    private readonly findAllOrganizationsUseCase: FindAllOrganizationsUseCase,
    private readonly findOrganizationByIdUseCase: FindOrganizationByIdUseCase,
    private readonly updateOrganizationUseCase: UpdateOrganizationUseCase,
    private readonly deleteOrganizationUseCase: DeleteOrganizationUseCase,
  ) {}

  @UseGuards(TenantAccessGuard, TenantPermissionGuard)
  @RequirePermission('organizations', 'read')
  @Get()
  async getList() {
    return await this.findAllOrganizationsUseCase.execute();
  }

  @UseGuards(TenantAccessGuard, TenantPermissionGuard)
  @RequirePermission('organizations', 'read')
  @Get('/:id')
  async findById(@Param('id') id: string) {
    return await this.findOrganizationByIdUseCase.execute(id);
  }

  @MaxFileSize(undefined, 5)
  @UseGuards(TenantAccessGuard, TenantPermissionGuard)
  @RequirePermission('organizations', 'create')
  @Post()
  async create(@Body() dto: CreateOrganizationDTO) {
    return await this.createOrganizationUseCase.execute(dto);
  }

  @UseGuards(TenantAccessGuard, TenantPermissionGuard)
  @RequirePermission('organizations', 'update')
  @Patch('/:id')
  async update(@Param('id') id: string, @Body() dto: UpdateOrganizationDTO) {
    return await this.updateOrganizationUseCase.execute(id, dto);
  }

  @UseGuards(TenantAccessGuard, TenantPermissionGuard)
  @RequirePermission('organizations', 'delete')
  @Delete('/:id')
  async delete(@Param('id') id: string) {
    return await this.deleteOrganizationUseCase.execute(id);
  }
}
