import { PlatformPermissionGuard } from '@common/guards';
import { Module } from '@nestjs/common';
import { SocialHighlightController } from './social-highlight.controller';
import { SocialHighlightRepository } from './repository/social-highlight.repository';
import { CreateSocialHighlightUseCase } from './use-cases/create-social-highlight.use-case';
import { DeleteSocialHighlightUseCase } from './use-cases/delete-social-highlight.use-case';
import { FindAllSocialHighlightsUseCase } from './use-cases/find-all-social-highlights.use-case';
import { GetSocialHighlightUseCase } from './use-cases/get-social-highlight-by-id.use-case';
import { FindListSocialHighlightsUseCase } from './use-cases/list-social-highlight.use-case';
import { UpdateSocialHighlightUseCase } from './use-cases/update-social-highlight.use-case';

@Module({
  controllers: [SocialHighlightController],
  providers: [
    PlatformPermissionGuard,
    SocialHighlightRepository,
    FindAllSocialHighlightsUseCase,
    FindListSocialHighlightsUseCase,
    GetSocialHighlightUseCase,
    CreateSocialHighlightUseCase,
    UpdateSocialHighlightUseCase,
    DeleteSocialHighlightUseCase,
    {
      provide: 'SocialHighlightRepository',
      useExisting: SocialHighlightRepository,
    },
  ],
  exports: [
    SocialHighlightRepository,
    FindAllSocialHighlightsUseCase,
    FindListSocialHighlightsUseCase,
    GetSocialHighlightUseCase,
    CreateSocialHighlightUseCase,
    UpdateSocialHighlightUseCase,
    DeleteSocialHighlightUseCase,
    {
      provide: 'SocialHighlightRepository',
      useExisting: SocialHighlightRepository,
    },
  ],
})
export class SocialHighlightModule {}
