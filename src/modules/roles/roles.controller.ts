import { RequirePermission } from '@common/decorators';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CreateRoleDTO, FindAllRolesFiltersDTO, UpdateRoleDTO } from './dto';
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

  @RequirePermission('roles', 'read')
  @Get()
  async findAll(@Query() filters: FindAllRolesFiltersDTO = {}) {
    return this.findAllRolesUseCase.execute(filters);
  }

  @RequirePermission('roles', 'read')
  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.findRoleByIdUseCase.execute(id);
  }

  @RequirePermission('roles', 'create')
  @Post()
  async create(@Body() dto: CreateRoleDTO) {
    return this.createRoleUseCase.execute(dto);
  }

  @RequirePermission('roles', 'update')
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateRoleDTO) {
    return this.updateRoleUseCase.execute(id, dto);
  }

  @RequirePermission('roles', 'delete')
  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.deleteRoleUseCase.execute(id);

    return {
      success: true,
    };
  }
}
