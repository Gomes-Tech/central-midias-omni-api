import { PlatformPermissionGuard } from '@common/guards';
import { Module } from '@nestjs/common';
import { BannerController } from './banner.controller';
import { BannerRepository } from './repository/banner.repository';
import { CreateBannerUseCase } from './use-cases/create-banner.use-case';
import { DeleteBannerUseCase } from './use-cases/delete-banner.use-case';
import { FindAllBannersUseCase } from './use-cases/find-all-banners.use-case';
import { GetBannerUseCase } from './use-cases/get-banner-by-id.use-case';
import { FindListBannersUseCase } from './use-cases/list-banner.use-case';
import { UpdateBannerUseCase } from './use-cases/update-banner.use-case';

@Module({
  controllers: [BannerController],
  providers: [
    PlatformPermissionGuard,
    BannerRepository,
    FindAllBannersUseCase,
    FindListBannersUseCase,
    GetBannerUseCase,
    CreateBannerUseCase,
    UpdateBannerUseCase,
    DeleteBannerUseCase,
    {
      provide: 'BannerRepository',
      useExisting: BannerRepository,
    },
  ],
  exports: [
    BannerRepository,
    FindAllBannersUseCase,
    FindListBannersUseCase,
    GetBannerUseCase,
    CreateBannerUseCase,
    UpdateBannerUseCase,
    DeleteBannerUseCase,
    {
      provide: 'BannerRepository',
      useExisting: BannerRepository,
    },
  ],
})
export class BannerModule {}
