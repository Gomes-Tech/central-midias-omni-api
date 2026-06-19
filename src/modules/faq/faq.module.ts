import { PlatformPermissionGuard } from '@common/guards';
import { Module } from '@nestjs/common';
import { FaqController } from './faq.controller';
import { FaqRepository } from './repository/faq.repository';
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

@Module({
  controllers: [FaqController],
  providers: [
    PlatformPermissionGuard,
    FaqRepository,
    FindAllFaqsUseCase,
    FindAllFaqItemsUseCase,
    GetFaqByIdUseCase,
    GetFaqItemByIdUseCase,
    CreateFaqUseCase,
    UpdateFaqUseCase,
    DeleteFaqUseCase,
    CreateFaqItemUseCase,
    UpdateFaqItemUseCase,
    DeleteFaqItemUseCase,
    UpsertFaqDetailUseCase,
    {
      provide: 'FaqRepository',
      useExisting: FaqRepository,
    },
  ],
  exports: [
    FaqRepository,
    FindAllFaqsUseCase,
    FindAllFaqItemsUseCase,
    GetFaqByIdUseCase,
    GetFaqItemByIdUseCase,
    CreateFaqUseCase,
    UpdateFaqUseCase,
    DeleteFaqUseCase,
    CreateFaqItemUseCase,
    UpdateFaqItemUseCase,
    DeleteFaqItemUseCase,
    UpsertFaqDetailUseCase,
    {
      provide: 'FaqRepository',
      useExisting: FaqRepository,
    },
  ],
})
export class FaqModule {}
