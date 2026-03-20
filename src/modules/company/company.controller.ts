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
  UseGuards,
} from '@nestjs/common';
import { CreateCompanyDTO, UpdateCompanyDTO } from './dto';
import {
  CreateCompanyUseCase,
  DeleteCompanyUseCase,
  FindAllCompaniesUseCase,
  FindCompanyByIdUseCase,
  UpdateCompanyUseCase,
} from './use-cases';

@Controller('companies')
export class CompanyController {
  constructor(
    private readonly createCompanyUseCase: CreateCompanyUseCase,
    private readonly findAllCompaniesUseCase: FindAllCompaniesUseCase,
    private readonly findCompanyByIdUseCase: FindCompanyByIdUseCase,
    private readonly updateCompanyUseCase: UpdateCompanyUseCase,
    private readonly deleteCompanyUseCase: DeleteCompanyUseCase,
  ) {}

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermission('companies', 'create')
  @Post()
  async create(@Body() dto: CreateCompanyDTO) {
    return await this.createCompanyUseCase.execute(dto);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermission('companies', 'read')
  @Get()
  async getList() {
    return await this.findAllCompaniesUseCase.execute();
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermission('companies', 'read')
  @Get('/:id')
  async findById(@Param('id') id: string) {
    return await this.findCompanyByIdUseCase.execute(id);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermission('companies', 'update')
  @Patch('/:id')
  async update(@Param('id') id: string, @Body() dto: UpdateCompanyDTO) {
    return await this.updateCompanyUseCase.execute(id, dto);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermission('companies', 'delete')
  @Delete('/:id')
  async delete(@Param('id') id: string) {
    return await this.deleteCompanyUseCase.execute(id);
  }
}
