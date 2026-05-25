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
import { CreateTagDTO, FindAllTagsFiltersDTO, UpdateTagDTO } from './dto';
import {
  CreateTagUseCase,
  DeleteTagUseCase,
  FindAllTagsUseCase,
  FindTagByIdUseCase,
  UpdateTagUseCase,
} from './use-cases';

@UseGuards(PlatformPermissionGuard)
@Controller('tags')
export class TagController {
  constructor(
    private readonly findAllTagsUseCase: FindAllTagsUseCase,
    private readonly findTagByIdUseCase: FindTagByIdUseCase,
    private readonly createTagUseCase: CreateTagUseCase,
    private readonly updateTagUseCase: UpdateTagUseCase,
    private readonly deleteTagUseCase: DeleteTagUseCase,
  ) {}

  @RequirePermission('tags', 'read')
  @Get()
  async findAll(
    @OrgId() organizationId: string,
    @Query() filters: FindAllTagsFiltersDTO = {},
  ) {
    return await this.findAllTagsUseCase.execute(organizationId, filters);
  }

  @RequirePermission('tags', 'read')
  @Get(':id')
  async findById(@Param('id') id: string, @OrgId() organizationId: string) {
    return await this.findTagByIdUseCase.execute(id, organizationId);
  }

  @RequirePermission('tags', 'create')
  @Post()
  async create(@OrgId() organizationId: string, @Body() dto: CreateTagDTO) {
    return await this.createTagUseCase.execute(organizationId, dto);
  }

  @RequirePermission('tags', 'update')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @OrgId() organizationId: string,
    @Body() dto: UpdateTagDTO,
  ) {
    return await this.updateTagUseCase.execute(id, organizationId, dto);
  }

  @RequirePermission('tags', 'delete')
  @Delete(':id')
  async delete(@Param('id') id: string, @OrgId() organizationId: string) {
    await this.deleteTagUseCase.execute(id, organizationId);
  }
}
