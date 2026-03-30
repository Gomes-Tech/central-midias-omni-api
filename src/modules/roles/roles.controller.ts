import { OrgId, RequirePermission } from '@common/decorators';
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
  UseGuards,
} from '@nestjs/common';
import {
  CreateGlobalRoleDTO,
  CreateRoleDTO,
  FindAllRolesFiltersDTO,
  UpdateRoleDTO,
} from './dto';
import {
  CreateGlobalRoleUseCase,
  CreateRoleUseCase,
  DeleteRoleUseCase,
  FindAllRolesUseCase,
  FindRoleByIdUseCase,
  UpdateRoleUseCase,
} from './use-cases';

@UseGuards(PlatformPermissionGuard)
@Controller('roles')
export class RolesController {
  constructor(
    private readonly findAllRolesUseCase: FindAllRolesUseCase,
    private readonly findRoleByIdUseCase: FindRoleByIdUseCase,
    private readonly createRoleUseCase: CreateRoleUseCase,
    private readonly createGlobalRoleUseCase: CreateGlobalRoleUseCase,
    private readonly updateRoleUseCase: UpdateRoleUseCase,
    private readonly deleteRoleUseCase: DeleteRoleUseCase,
  ) {}

  @RequirePermission('roles', 'read')
  @Get()
  async findAll(@Query() filters: FindAllRolesFiltersDTO = {}) {
    return await this.findAllRolesUseCase.execute(filters);
  }

  @RequirePermission('roles', 'read')
  @Get(':id')
  async findById(@Param('id') id: string) {
    return await this.findRoleByIdUseCase.execute(id);
  }

  @RequirePermission('roles', 'create')
  @Post()
  async create(@Body() dto: CreateGlobalRoleDTO) {
    return await this.createGlobalRoleUseCase.execute(dto);
  }

  @RequirePermission('roles', 'create')
  @Post('/permissions')
  async createPermissions(
    @Body() dto: CreateRoleDTO,
    @OrgId() organizationId: string,
  ) {
    return await this.createRoleUseCase.execute(dto, organizationId);
  }

  @RequirePermission('roles', 'update')
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateRoleDTO) {
    return await this.updateRoleUseCase.execute(id, dto);
  }

  @RequirePermission('roles', 'delete')
  @Delete(':id')
  async delete(@Param('id') id: string) {
    return await this.deleteRoleUseCase.execute(id);
  }
}
