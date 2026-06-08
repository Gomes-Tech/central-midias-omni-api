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
  FindAllRolePermissionsFiltersDTO,
  FindAllRolesFiltersDTO,
  UpdateGlobalRoleDTO,
  UpdateRoleDTO,
} from './dto';
import {
  CreateGlobalRoleUseCase,
  CreateRoleUseCase,
  DeleteGlobalRoleUseCase,
  DeleteRoleUseCase,
  FindAllGlobalRolesSelectUseCase,
  FindAllRolePermissionsUseCase,
  FindAllRolesUseCase,
  FindAllSelectRolesUseCase,
  FindGlobalRoleByIdUseCase,
  FindRoleByIdUseCase,
  UpdateGlobalRoleUseCase,
  UpdateRoleUseCase,
} from './use-cases';

@UseGuards(PlatformPermissionGuard)
@Controller('roles')
export class RolesController {
  constructor(
    private readonly findAllRolesUseCase: FindAllRolesUseCase,
    private readonly findAllRolePermissionsUseCase: FindAllRolePermissionsUseCase,
    private readonly findAllSelectRolesUseCase: FindAllSelectRolesUseCase,
    private readonly findRoleByIdUseCase: FindRoleByIdUseCase,
    private readonly createRoleUseCase: CreateRoleUseCase,
    private readonly createGlobalRoleUseCase: CreateGlobalRoleUseCase,
    private readonly findGlobalRoleByIdUseCase: FindGlobalRoleByIdUseCase,
    private readonly updateGlobalRoleUseCase: UpdateGlobalRoleUseCase,
    private readonly deleteGlobalRoleUseCase: DeleteGlobalRoleUseCase,
    private readonly updateRoleUseCase: UpdateRoleUseCase,
    private readonly deleteRoleUseCase: DeleteRoleUseCase,
    private readonly findAllGlobalRolesSelectUseCase: FindAllGlobalRolesSelectUseCase,
  ) {}

  @RequirePermission('roles', 'read')
  @Get()
  async findAll(@Query() filters: FindAllRolesFiltersDTO = {}) {
    return await this.findAllRolesUseCase.execute(filters);
  }

  @RequirePermission('roles', 'read')
  @Get('/select')
  async findAllSelect(@Query('isMember') isMember: boolean = false) {
    return await this.findAllSelectRolesUseCase.execute(isMember);
  }

  @RequirePermission('roles', 'read')
  @Get('/global/select')
  async findAllGlobalRolesSelect() {
    return await this.findAllGlobalRolesSelectUseCase.execute();
  }

  @RequirePermission('roles', 'read')
  @Get('/global/:id')
  async findGlobalRoleById(@Param('id') id: string) {
    return await this.findGlobalRoleByIdUseCase.execute(id);
  }

  @RequirePermission('roles', 'read')
  @Get('/permissions')
  async findAllPermissions(
    @OrgId() organizationId: string,
    @Query() filters: FindAllRolePermissionsFiltersDTO = {},
  ) {
    return await this.findAllRolePermissionsUseCase.execute(
      organizationId,
      filters,
    );
  }

  @RequirePermission('roles', 'read')
  @Get(':id')
  async findById(@Param('id') id: string, @OrgId() organizationId: string) {
    return await this.findRoleByIdUseCase.execute(id, organizationId);
  }

  @RequirePermission('roles', 'create')
  @Post()
  async create(@Body() dto: CreateGlobalRoleDTO) {
    return await this.createGlobalRoleUseCase.execute(dto);
  }

  @RequirePermission('roles', 'update')
  @Patch('/global/:id')
  async updateGlobalRole(
    @Param('id') id: string,
    @Body() dto: UpdateGlobalRoleDTO,
  ) {
    return await this.updateGlobalRoleUseCase.execute(id, dto);
  }

  @RequirePermission('roles', 'delete')
  @Delete('/global/:id')
  async deleteGlobalRole(@Param('id') id: string) {
    return await this.deleteGlobalRoleUseCase.execute(id);
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
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDTO,
    @OrgId() organizationId: string,
  ) {
    return await this.updateRoleUseCase.execute(id, dto, organizationId);
  }

  @RequirePermission('roles', 'delete')
  @Delete(':id')
  async delete(@Param('id') id: string, @OrgId() organizationId: string) {
    return await this.deleteRoleUseCase.execute(id, organizationId);
  }
}
