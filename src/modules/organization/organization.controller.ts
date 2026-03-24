import { MaxFileSize, RequirePermission, UserId } from '@common/decorators';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
} from '@nestjs/common';
import { CreateOrganizationDTO, UpdateOrganizationDTO } from './dto';
import {
  CreateOrganizationUseCase,
  DeleteOrganizationUseCase,
  FindAllOrganizationsUseCase,
  FindOrganizationByIdUseCase,
  UpdateOrganizationUseCase,
} from './use-cases';

@Controller('organizations')
export class OrganizationController {
  constructor(
    private readonly createOrganizationUseCase: CreateOrganizationUseCase,
    private readonly findAllOrganizationsUseCase: FindAllOrganizationsUseCase,
    private readonly findOrganizationByIdUseCase: FindOrganizationByIdUseCase,
    private readonly updateOrganizationUseCase: UpdateOrganizationUseCase,
    private readonly deleteOrganizationUseCase: DeleteOrganizationUseCase,
  ) {}

  @RequirePermission('organizations', 'read')
  @Get()
  async getList() {
    return await this.findAllOrganizationsUseCase.execute();
  }

  @RequirePermission('organizations', 'read')
  @Get('/:id')
  async findById(@Param('id') id: string) {
    return await this.findOrganizationByIdUseCase.execute(id);
  }

  @MaxFileSize(undefined, 5)
  @RequirePermission('organizations', 'create')
  @Post()
  async create(
    @Body() dto: CreateOrganizationDTO,
    @UserId() userId: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return await this.createOrganizationUseCase.execute(dto, userId, file);
  }

  @RequirePermission('organizations', 'update')
  @Patch('/:id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationDTO,
    @UserId() userId: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return await this.updateOrganizationUseCase.execute(id, dto, userId, file);
  }

  @RequirePermission('organizations', 'delete')
  @Delete('/:id')
  async delete(@Param('id') id: string) {
    return await this.deleteOrganizationUseCase.execute(id);
  }
}
