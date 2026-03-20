import { RequirePermission } from '@common/decorators';
import { AuthGuard, PermissionsGuard } from '@common/guards';
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
import { CreateRoleDTO, UpdateRoleDTO } from './dto';
import {
  CreateRoleUseCase,
  DeleteRoleUseCase,
  FindAllRolesUseCase,
  FindRoleByIdUseCase,
  UpdateRoleUseCase,
} from './use-cases';

@Controller('roles')
export class RolesController {
  constructor(
    private readonly findAllRolesUseCase: FindAllRolesUseCase,
    private readonly findRoleByIdUseCase: FindRoleByIdUseCase,
    private readonly createRoleUseCase: CreateRoleUseCase,
    private readonly updateRoleUseCase: UpdateRoleUseCase,
    private readonly deleteRoleUseCase: DeleteRoleUseCase,
  ) {}

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermission('roles', 'read')
  @Get()
  async findAll(@Query('includeDeleted') includeDeleted?: string) {
    return this.findAllRolesUseCase.execute({
      includeDeleted: includeDeleted === 'true',
    });
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermission('roles', 'read')
  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.findRoleByIdUseCase.execute(id);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermission('roles', 'create')
  @Post()
  async create(@Body() dto: CreateRoleDTO) {
    return this.createRoleUseCase.execute(dto);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermission('roles', 'update')
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateRoleDTO) {
    return this.updateRoleUseCase.execute(id, dto);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermission('roles', 'delete')
  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.deleteRoleUseCase.execute(id);

    return {
      success: true,
    };
  }
}
