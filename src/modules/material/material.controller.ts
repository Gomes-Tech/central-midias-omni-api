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
  UseGuards,
} from '@nestjs/common';
import {
  CreateMaterialDTO,
  FindAllMaterialsFiltersDTO,
  UpdateMaterialDTO,
} from './dto';
import {
  CreateMaterialUseCase,
  DeleteMaterialUseCase,
  FindAllMaterialsUseCase,
  FindMaterialByIdUseCase,
  UpdateMaterialUseCase,
} from './use-cases';

@UseGuards(PlatformPermissionGuard)
@Controller('materials')
export class MaterialController {
  constructor(
    private readonly findAllMaterialsUseCase: FindAllMaterialsUseCase,
    private readonly findMaterialByIdUseCase: FindMaterialByIdUseCase,
    private readonly createMaterialUseCase: CreateMaterialUseCase,
    private readonly updateMaterialUseCase: UpdateMaterialUseCase,
    private readonly deleteMaterialUseCase: DeleteMaterialUseCase,
  ) {}

  @RequirePermission('materials', 'read')
  @Get()
  async findAll(
    @OrgId() organizationId: string,
    @Query() filters: FindAllMaterialsFiltersDTO = {},
  ) {
    return await this.findAllMaterialsUseCase.execute(organizationId, filters);
  }

  @RequirePermission('materials', 'read')
  @Get(':id')
  async findById(@Param('id') id: string, @OrgId() organizationId: string) {
    return await this.findMaterialByIdUseCase.execute(id, organizationId);
  }

  @RequirePermission('materials', 'create')
  @Post()
  async create(
    @Body() dto: CreateMaterialDTO,
    @OrgId() organizationId: string,
    @UserId() userId: string,
  ) {
    await this.createMaterialUseCase.execute(organizationId, dto, userId);
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
}
