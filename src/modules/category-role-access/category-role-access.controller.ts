import { OrgId, RequirePermission } from '@common/decorators';
import { PlatformPermissionGuard } from '@common/guards';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CreateCategoryRoleAccessDTO } from './dto/create-category-role-access.dto';
import { CreateCategoryRoleAccessUseCase } from './use-cases/create-category-role-access.use-case';
import { DeleteCategoryRoleAccessUseCase } from './use-cases/delete-category-role-access.use-case';
import { FindAllCategoryRoleAccessesUseCase } from './use-cases/find-all-category-role-accesses.use-case';
import { FindRolesByCategoryUseCase } from './use-cases/find-roles-by-category.use-case';

@UseGuards(PlatformPermissionGuard)
@Controller('category-role-accesses')
export class CategoryRoleAccessController {
  constructor(
    private readonly createCategoryRoleAccessUseCase: CreateCategoryRoleAccessUseCase,
    private readonly deleteCategoryRoleAccessUseCase: DeleteCategoryRoleAccessUseCase,
    private readonly findAllCategoryRoleAccessesUseCase: FindAllCategoryRoleAccessesUseCase,
    private readonly findRolesByCategoryUseCase: FindRolesByCategoryUseCase,
  ) {}

  @RequirePermission('categories', 'read')
  @Get()
  async findAll(@OrgId() organizationId: string) {
    return await this.findAllCategoryRoleAccessesUseCase.execute(
      organizationId,
    );
  }

  @RequirePermission('categories', 'read')
  @Get('category/:categoryId/roles')
  async findRolesByCategory(
    @Param('categoryId') categoryId: string,
    @OrgId() organizationId: string,
  ) {
    return await this.findRolesByCategoryUseCase.execute(
      categoryId,
      organizationId,
    );
  }

  @RequirePermission('categories', 'update')
  @Post()
  async create(
    @Body() dto: CreateCategoryRoleAccessDTO,
    @OrgId() organizationId: string,
  ) {
    return await this.createCategoryRoleAccessUseCase.execute(
      organizationId,
      dto,
    );
  }

  @RequirePermission('categories', 'update')
  @Delete(':id')
  async delete(@Param('id') id: string, @OrgId() organizationId: string) {
    await this.deleteCategoryRoleAccessUseCase.execute(id, organizationId);
  }
}
