import {
  MaxFileSize,
  OrgId,
  RequirePermission,
  UserId,
} from '@common/decorators';
import { PlatformPermissionGuard } from '@common/guards';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
} from '@nestjs/common';
import { PaginatedResponse } from '../../types';
import {
  CreateFaqDTO,
  CreateFaqItemDTO,
  FindAllFaqItemsFiltersDTO,
  FindAllFaqsFiltersDTO,
  UpdateFaqDTO,
  UpdateFaqItemDTO,
  UpsertFaqDetailDTO,
} from './dto';
import { FaqItemDetail, FaqItemEntity } from './entities';
import {
  CreateFaqItemUseCase,
  CreateFaqUseCase,
  DeleteFaqItemUseCase,
  DeleteFaqUseCase,
  FindAllFaqItemsUseCase,
  FindAllFaqsUseCase,
  GetFaqByIdUseCase,
  GetFaqItemByIdUseCase,
  UpdateFaqItemUseCase,
  UpdateFaqUseCase,
  UpsertFaqDetailUseCase,
} from './use-cases';

@UseGuards(PlatformPermissionGuard)
@Controller('faqs')
export class FaqController {
  constructor(
    private readonly findAllFaqsUseCase: FindAllFaqsUseCase,
    private readonly findAllFaqItemsUseCase: FindAllFaqItemsUseCase,
    private readonly getFaqByIdUseCase: GetFaqByIdUseCase,
    private readonly getFaqItemByIdUseCase: GetFaqItemByIdUseCase,
    private readonly createFaqUseCase: CreateFaqUseCase,
    private readonly updateFaqUseCase: UpdateFaqUseCase,
    private readonly deleteFaqUseCase: DeleteFaqUseCase,
    private readonly createFaqItemUseCase: CreateFaqItemUseCase,
    private readonly updateFaqItemUseCase: UpdateFaqItemUseCase,
    private readonly deleteFaqItemUseCase: DeleteFaqItemUseCase,
    private readonly upsertFaqDetailUseCase: UpsertFaqDetailUseCase,
  ) {}

  @RequirePermission('faqs', 'read')
  @Get()
  async list(
    @OrgId() organizationId: string,
    @Query() filters: FindAllFaqsFiltersDTO = {},
  ) {
    return await this.findAllFaqsUseCase.execute(organizationId, filters);
  }

  @RequirePermission('faqs', 'read')
  @Get('items')
  async listItems(
    @OrgId() organizationId: string,
    @Query() filters: FindAllFaqItemsFiltersDTO = {},
  ): Promise<PaginatedResponse<FaqItemEntity>> {
    return await this.findAllFaqItemsUseCase.execute(organizationId, filters);
  }

  @RequirePermission('faqs', 'read')
  @Get('items/:itemId')
  async getItemById(
    @Param('itemId') itemId: string,
    @OrgId() organizationId: string,
  ): Promise<FaqItemDetail> {
    return await this.getFaqItemByIdUseCase.execute(itemId, organizationId);
  }

  @RequirePermission('faqs', 'update')
  @Patch('items/:itemId')
  async updateItem(
    @Param('itemId') itemId: string,
    @OrgId() organizationId: string,
    @Body() dto: UpdateFaqItemDTO,
    @UserId() userId: string,
  ) {
    await this.updateFaqItemUseCase.execute(
      itemId,
      organizationId,
      dto,
      userId,
    );
  }

  @RequirePermission('faqs', 'delete')
  @Delete('items/:itemId')
  async deleteItem(
    @Param('itemId') itemId: string,
    @OrgId() organizationId: string,
    @UserId() userId: string,
  ) {
    await this.deleteFaqItemUseCase.execute(itemId, organizationId, userId);
  }

  @RequirePermission('faqs', 'read')
  @Get(':id')
  async getById(@Param('id') id: string, @OrgId() organizationId: string) {
    return await this.getFaqByIdUseCase.execute(id, organizationId);
  }

  @RequirePermission('faqs', 'create')
  @Post()
  async create(
    @OrgId() organizationId: string,
    @Body() dto: CreateFaqDTO,
    @UserId() userId: string,
  ) {
    return await this.createFaqUseCase.execute(organizationId, dto, userId);
  }

  @RequirePermission('faqs', 'update')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @OrgId() organizationId: string,
    @Body() dto: UpdateFaqDTO,
    @UserId() userId: string,
  ) {
    await this.updateFaqUseCase.execute(id, organizationId, dto, userId);
  }

  @RequirePermission('faqs', 'delete')
  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @OrgId() organizationId: string,
    @UserId() userId: string,
  ) {
    await this.deleteFaqUseCase.execute(id, organizationId, userId);
  }

  @RequirePermission('faqs', 'create')
  @Post(':id/items')
  async createItem(
    @Param('id') faqId: string,
    @OrgId() organizationId: string,
    @Body() dto: CreateFaqItemDTO,
    @UserId() userId: string,
  ) {
    return await this.createFaqItemUseCase.execute(
      faqId,
      organizationId,
      dto,
      userId,
    );
  }

  @MaxFileSize(undefined, 5)
  @RequirePermission('faqs', 'update')
  @Put(':id/detail')
  async upsertDetail(
    @Param('id') faqId: string,
    @OrgId() organizationId: string,
    @Body() dto: UpsertFaqDetailDTO,
    @UserId() userId: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return await this.upsertFaqDetailUseCase.execute(
      faqId,
      organizationId,
      dto,
      userId,
      file,
    );
  }
}
