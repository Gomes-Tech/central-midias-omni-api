import { PlatformPermissionGuard } from '@common/guards';
import { MemberModule } from '@modules/member';
import { Module } from '@nestjs/common';
import { AvatarController } from './avatar.controller';
import { AvatarRepository } from './repository';
import {
  GetOrganizationAvatarsUseCase,
  UpsertOrganizationAvatarUseCase,
} from './use-cases';

@Module({
  imports: [MemberModule],
  controllers: [AvatarController],
  providers: [
    PlatformPermissionGuard,
    AvatarRepository,
    GetOrganizationAvatarsUseCase,
    UpsertOrganizationAvatarUseCase,
    {
      provide: 'AvatarRepository',
      useExisting: AvatarRepository,
    },
  ],
  exports: [
    AvatarRepository,
    GetOrganizationAvatarsUseCase,
    UpsertOrganizationAvatarUseCase,
    {
      provide: 'AvatarRepository',
      useExisting: AvatarRepository,
    },
  ],
})
export class AvatarModule {}
