import { OrgId, RequirePermission, UserId } from '@common/decorators';
import {
  CategoryPermissionGuard,
  PlatformPermissionGuard,
} from '@common/guards';
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
  FindCategoryTreeBySlugUseCase,
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
    private readonly findCategoryTreeBySlugUseCase: FindCategoryTreeBySlugUseCase,
    private readonly findCategoryTreeUseCase: FindCategoryTreeUseCase,
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
  async findTree(@OrgId() organizationId: string, @UserId() userId: string) {
    return await this.findCategoryTreeUseCase.execute(organizationId, userId);
  }

  @UseGuards(CategoryPermissionGuard)
  @Get('slug/:slug')
  async findBySlug(
    @Param('slug') slug: string,
    @OrgId() organizationId: string,
    @UserId() userId: string,
  ) {
    return await this.findCategoryTreeBySlugUseCase.execute(
      slug,
      organizationId,
      userId,
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
