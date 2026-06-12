import { StorageService } from '@infrastructure/providers';
import { Injectable } from '@nestjs/common';
import { SocialHighlightRepository } from '../repository/social-highlight.repository';
import { GetSocialHighlightUseCase } from './get-social-highlight-by-id.use-case';

@Injectable()
export class DeleteSocialHighlightUseCase {
  constructor(
    private readonly socialHighlightRepository: SocialHighlightRepository,
    private readonly getSocialHighlightUseCase: GetSocialHighlightUseCase,
    private readonly storageService: StorageService,
  ) {}

  private toStoragePath(publicUrl: string): string {
    return publicUrl.startsWith('/storage/')
      ? publicUrl.replace('/storage/', '')
      : publicUrl;
  }

  async execute(id: string, organizationId: string, userId: string) {
    const banner = await this.getSocialHighlightUseCase.execute(id, organizationId);

    await this.socialHighlightRepository.softDelete(id, organizationId, userId);

    await this.storageService.deleteFile([
      this.toStoragePath(banner.mobileImageKey),
      this.toStoragePath(banner.desktopImageKey),
    ]);
  }
}
