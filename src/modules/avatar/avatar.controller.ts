import { MaxFileSize, OrgId, UserId } from '@common/decorators';
import { BadRequestException } from '@common/filters';
import { PlatformPermissionGuard } from '@common/guards';
import {
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
} from '@nestjs/common';
import { OrganizationAvatarType, OrganizationAvatars } from './entities';
import {
  GetOrganizationAvatarsUseCase,
  UpsertOrganizationAvatarUseCase,
} from './use-cases';

@UseGuards(PlatformPermissionGuard)
@Controller('avatars')
export class AvatarController {
  constructor(
    private readonly getOrganizationAvatarsUseCase: GetOrganizationAvatarsUseCase,
    private readonly upsertOrganizationAvatarUseCase: UpsertOrganizationAvatarUseCase,
  ) {}

  @Get()
  async get(
    @OrgId() organizationId: string,
    @UserId() userId: string,
  ): Promise<OrganizationAvatars> {
    return await this.getOrganizationAvatarsUseCase.execute(
      organizationId,
      userId,
    );
  }

  @MaxFileSize(undefined, 5)
  @Post(':type')
  async upsert(
    @OrgId() organizationId: string,
    @UserId() userId: string,
    @Param('type') type: OrganizationAvatarType,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<void> {
    if (type !== 'standard' && type !== 'customizable') {
      throw new BadRequestException('Tipo de avatar inválido');
    }

    await this.upsertOrganizationAvatarUseCase.execute(
      organizationId,
      userId,
      type,
      file,
    );
  }
}
