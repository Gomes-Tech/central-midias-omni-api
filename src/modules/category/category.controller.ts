import { OrgId, RequirePermission, UserId } from '@common/decorators';
import {
  CategoryPermissionGuard,
  PlatformPermissionGuard,
} from '@common/guards';
import { FindMaterialsByCategorySlugFiltersDTO } from '@modules/material/dto';
import { FindMaterialsByCategorySlugUseCase } from '@modules/material/use-cases';
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
  FindCategoryTreeBySlugPathUseCase,
  FindCategoryTreeUseCase,
  UpdateCategoryUseCase,
} from './use-cases';

@Controller('categories')
export class CategoryController {
  constructor(
    private readonly createCategoryUseCase: CreateCategoryUseCase,
    private readonly deleteCategoryUseCase: DeleteCategoryUseCase,
    private readonly findAllCategoriesUseCase: FindAllCategoriesUseCase,
    private readonly findCategoryByIdUseCase: FindCategoryByIdUseCase,
    private readonly findCategoryTreeBySlugPathUseCase: FindCategoryTreeBySlugPathUseCase,
    private readonly findCategoryTreeUseCase: FindCategoryTreeUseCase,
    private readonly findMaterialsByCategorySlugUseCase: FindMaterialsByCategorySlugUseCase,
    private readonly updateCategoryUseCase: UpdateCategoryUseCase,
  ) {}

  @UseGuards(PlatformPermissionGuard)
  @RequirePermission('categories', 'read')
  @Get()
  async findAll(
    @OrgId() organizationId: string,
    @Query() filters: FindAllCategoriesFiltersDTO = {},
  ) {
    return await this.findAllCategoriesUseCase.execute(organizationId, filters);
  }

  @Get('tree')
  async findTree(
    @OrgId() organizationId: string,
    @UserId() userId: string,
    @Query() filters: FindAllCategoriesFiltersDTO = {},
  ) {
    return await this.findCategoryTreeUseCase.execute(
      organizationId,
      userId,
      filters,
    );
  }

  @UseGuards(CategoryPermissionGuard)
  @Get('/tree/:slug')
  async findByPath(
    @Query('slug') slugPath: string,
    @OrgId() organizationId: string,
    @UserId() userId: string,
  ) {
    return await this.findCategoryTreeBySlugPathUseCase.execute(
      slugPath,
      organizationId,
      userId,
    );
  }

  @UseGuards(PlatformPermissionGuard)
  @Get('*slugPath/materials')
  async findMaterialsBySlug(
    @Param('slugPath') slugPath: string | string[],
    @OrgId() organizationId: string,
    @Query() filters: FindMaterialsByCategorySlugFiltersDTO = {},
  ) {
    const normalizedSlugPath = Array.isArray(slugPath)
      ? slugPath.join('/')
      : slugPath;

    return await this.findMaterialsByCategorySlugUseCase.execute(
      organizationId,
      normalizedSlugPath,
      filters,
    );
  }

  @UseGuards(PlatformPermissionGuard)
  @RequirePermission('categories', 'read')
  @Get(':id')
  async findById(@Param('id') id: string, @OrgId() organizationId: string) {
    return await this.findCategoryByIdUseCase.execute(id, organizationId);
  }

  @UseGuards(PlatformPermissionGuard)
  @RequirePermission('categories', 'create')
  @Post()
  async create(
    @Body() dto: CreateCategoryDTO,
    @OrgId() organizationId: string,
    @UserId() userId: string,
  ) {
    await this.createCategoryUseCase.execute(organizationId, dto, userId);
  }

  @UseGuards(PlatformPermissionGuard)
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

  @UseGuards(PlatformPermissionGuard)
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
