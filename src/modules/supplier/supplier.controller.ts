import {
  MaxFileSize,
  OrgId,
  RequirePermission,
  UserId,
} from '@common/decorators';
import { PlatformPermissionGuard } from '@common/guards';
import { Controller, Get, Post, UploadedFile, UseGuards } from '@nestjs/common';
import { SupplierDocument } from './entities';
import {
  GetSupplierDocumentUseCase,
  UpsertSupplierDocumentUseCase,
} from './use-cases';

@UseGuards(PlatformPermissionGuard)
@Controller('suppliers')
export class SupplierController {
  constructor(
    private readonly getSupplierDocumentUseCase: GetSupplierDocumentUseCase,
    private readonly upsertSupplierDocumentUseCase: UpsertSupplierDocumentUseCase,
  ) {}

  @Get()
  async get(
    @OrgId() organizationId: string,
    @UserId() userId: string,
  ): Promise<SupplierDocument> {
    return await this.getSupplierDocumentUseCase.execute(
      organizationId,
      userId,
    );
  }

  @RequirePermission('suppliers', 'create')
  @MaxFileSize(undefined, undefined)
  @Post()
  async upsert(
    @OrgId() organizationId: string,
    @UserId() userId: string,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<void> {
    await this.upsertSupplierDocumentUseCase.execute(
      organizationId,
      userId,
      file,
    );
  }
}
