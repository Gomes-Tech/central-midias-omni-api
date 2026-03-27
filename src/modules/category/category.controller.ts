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
  CreateCategoryDTO,
  FindAllCategoriesFiltersDTO,
  UpdateCategoryDTO,
} from './dto';
import {
  CreateCategoryUseCase,
  DeleteCategoryUseCase,
  FindAllCategoriesUseCase,
  FindCategoryByIdUseCase,
  FindCategoryTreeUseCase,
  UpdateCategoryUseCase,
} from './use-cases';

@UseGuards(PlatformPermissionGuard)
@Controller('categories')
export class CategoryController {
  constructor(
    private readonly createCategoryUseCase: CreateCategoryUseCase,
    private readonly deleteCategoryUseCase: DeleteCategoryUseCase,
    private readonly findAllCategoriesUseCase: FindAllCategoriesUseCase,
    private readonly findCategoryByIdUseCase: FindCategoryByIdUseCase,
    private readonly findCategoryTreeUseCase: FindCategoryTreeUseCase,
    private readonly updateCategoryUseCase: UpdateCategoryUseCase,
  ) {}

  @RequirePermission('categories', 'read')
  @Get()
  async findAll(
    @OrgId() organizationId: string,
    @Query() filters: FindAllCategoriesFiltersDTO = {},
  ) {
    return await this.findAllCategoriesUseCase.execute(organizationId, filters);
  }

  @RequirePermission('categories', 'read')
  @Get('tree')
  async findTree(@OrgId() organizationId: string) {
    return await this.findCategoryTreeUseCase.execute(organizationId);
  }

  @RequirePermission('categories', 'read')
  @Get(':id')
  async findById(@Param('id') id: string, @OrgId() organizationId: string) {
    return await this.findCategoryByIdUseCase.execute(id, organizationId);
  }

  @RequirePermission('categories', 'create')
  @Post()
  async create(
    @Body() dto: CreateCategoryDTO,
    @OrgId() organizationId: string,
    @UserId() userId: string,
  ) {
    await this.createCategoryUseCase.execute(organizationId, dto, userId);
  }

  @RequirePermission('categories', 'update')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDTO,
    @OrgId() organizationId: string,
    @UserId() userId: string,
  ) {
    await this.updateCategoryUseCase.execute(id, organizationId, dto, userId);
  }

  @RequirePermission('categories', 'delete')
  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @OrgId() organizationId: string,
    @UserId() userId: string,
  ) {
    await this.deleteCategoryUseCase.execute(id, organizationId, userId);
  }
}
