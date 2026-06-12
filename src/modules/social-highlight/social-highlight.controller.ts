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
  Query,
  UploadedFiles,
  UseGuards,
} from '@nestjs/common';
import { FindAllSocialHighlightsFiltersDTO } from './dto';
import { CreateSocialHighlightDTO } from './dto/create-social-highlight.dto';
import { UpdateSocialHighlightDTO } from './dto/update-social-highlight.dto';
import { CreateSocialHighlightUseCase } from './use-cases/create-social-highlight.use-case';
import { DeleteSocialHighlightUseCase } from './use-cases/delete-social-highlight.use-case';
import { FindAllSocialHighlightsUseCase } from './use-cases/find-all-social-highlights.use-case';
import { GetSocialHighlightUseCase } from './use-cases/get-social-highlight-by-id.use-case';
import { FindListSocialHighlightsUseCase } from './use-cases/list-social-highlight.use-case';
import { UpdateSocialHighlightUseCase } from './use-cases/update-social-highlight.use-case';

type UploadedSocialHighlightFiles =
  | Express.Multer.File[]
  | Record<string, Express.Multer.File[] | Express.Multer.File | undefined>
  | undefined;

@UseGuards(PlatformPermissionGuard)
@Controller('social-highlights')
export class SocialHighlightController {
  constructor(
    private readonly createSocialHighlightUseCase: CreateSocialHighlightUseCase,
    private readonly findAllSocialHighlightsUseCase: FindAllSocialHighlightsUseCase,
    private readonly findListSocialHighlightsUseCase: FindListSocialHighlightsUseCase,
    private readonly getSocialHighlightUseCase: GetSocialHighlightUseCase,
    private readonly updateSocialHighlightUseCase: UpdateSocialHighlightUseCase,
    private readonly deleteSocialHighlightUseCase: DeleteSocialHighlightUseCase,
  ) {}

  private getFile(
    files: UploadedSocialHighlightFiles,
    fieldNames: string[],
  ): Express.Multer.File | undefined {
    if (!files) {
      return undefined;
    }

    if (Array.isArray(files)) {
      return files.find((file) => fieldNames.includes(file.fieldname));
    }

    for (const fieldName of fieldNames) {
      const file = files[fieldName];
      if (Array.isArray(file)) {
        return file[0];
      }
      if (file) {
        return file;
      }
    }

    return undefined;
  }

  @RequirePermission('social-highlights', 'read')
  @Get()
  async list(
    @OrgId() organizationId: string,
    @Query() filters: FindAllSocialHighlightsFiltersDTO = {},
  ) {
    return await this.findAllSocialHighlightsUseCase.execute(organizationId, filters);
  }

  @Get('/list')
  async listWeb(@OrgId() organizationId: string) {
    return await this.findListSocialHighlightsUseCase.execute(organizationId);
  }

  @RequirePermission('social-highlights', 'read')
  @Get(':id')
  async getById(@Param('id') id: string, @OrgId() organizationId: string) {
    const socialHighlight = await this.getSocialHighlightUseCase.execute(
      id,
      organizationId,
    );

    delete socialHighlight.mobileImageKey;
    delete socialHighlight.desktopImageKey;

    return socialHighlight;
  }

  @MaxFileSize(undefined, 5)
  @RequirePermission('social-highlights', 'create')
  @Post()
  async create(
    @OrgId() organizationId: string,
    @Body() dto: CreateSocialHighlightDTO,
    @UserId() userId: string,
    @UploadedFiles() files: UploadedSocialHighlightFiles,
  ) {
    const desktop = this.getFile(files, ['desktopImage', 'desktop']);
    const mobile = this.getFile(files, ['mobileImage', 'mobile']);

    await this.createSocialHighlightUseCase.execute(organizationId, dto, userId, {
      desktop,
      mobile,
    });
  }

  @MaxFileSize(undefined, 5)
  @RequirePermission('social-highlights', 'update')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @OrgId() organizationId: string,
    @Body() dto: UpdateSocialHighlightDTO,
    @UserId() userId: string,
    @UploadedFiles()
    files?: UploadedSocialHighlightFiles,
  ) {
    const desktopImage = this.getFile(files, ['desktopImage', 'desktop']);
    const mobileImage = this.getFile(files, ['mobileImage', 'mobile']);

    await this.updateSocialHighlightUseCase.execute(
      id,
      organizationId,
      dto,
      userId,
      {
        desktopImage,
        mobileImage,
      },
    );
  }

  @RequirePermission('social-highlights', 'delete')
  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @OrgId() organizationId: string,
    @UserId() userId: string,
  ) {
    await this.deleteSocialHighlightUseCase.execute(id, organizationId, userId);
  }
}
