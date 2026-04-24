import { RequirePermission } from '@common/decorators';
import { PlatformPermissionGuard } from '@common/guards';
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
import { CreateModuleDTO, UpdateModuleDTO } from './dto';
import {
  CreateModuleUseCase,
  DeleteModuleUseCase,
  FindAllModuleUseCase,
  FindModuleByIdUseCase,
  UpdateModuleUseCase,
} from './use-cases';

@UseGuards(PlatformPermissionGuard)
@Controller('modules')
export class ModuleController {
  constructor(
    private readonly findAllModuleUseCase: FindAllModuleUseCase,
    private readonly findModuleByIdUseCase: FindModuleByIdUseCase,
    private readonly createModuleUseCase: CreateModuleUseCase,
    private readonly updateModuleUseCase: UpdateModuleUseCase,
    private readonly deleteModuleUseCase: DeleteModuleUseCase,
  ) {}

  @RequirePermission('roles', 'read')
  @Get()
  async findAll() {
    return await this.findAllModuleUseCase.execute();
  }

  @RequirePermission('roles', 'read')
  @Get(':id')
  async findById(@Param('id') id: string) {
    return await this.findModuleByIdUseCase.execute(id);
  }

  @RequirePermission('roles', 'create')
  @Post()
  async create(@Body() dto: CreateModuleDTO) {
    return await this.createModuleUseCase.execute(dto);
  }

  @RequirePermission('roles', 'update')
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateModuleDTO) {
    return await this.updateModuleUseCase.execute(id, dto);
  }

  @RequirePermission('roles', 'delete')
  @Delete(':id')
  async delete(@Param('id') id: string) {
    return await this.deleteModuleUseCase.execute(id);
  }
}
