import { NotFoundException } from '@common/filters';
import { StorageService } from '@infrastructure/providers';
import { Inject, Injectable } from '@nestjs/common';
import { SocialHighlight } from '../entities';
import { SocialHighlightRepository } from '../repository/social-highlight.repository';

@Injectable()
export class GetSocialHighlightUseCase {
  constructor(
    @Inject('SocialHighlightRepository')
    private readonly socialHighlightRepository: SocialHighlightRepository,

    private readonly storageService: StorageService,
  ) {}

  async execute(id: string, organizationId: string): Promise<SocialHighlight> {
    const banner = await this.socialHighlightRepository.findById(id, organizationId);

    if (!banner) {
      throw new NotFoundException('Destaque social não encontrado');
    }

    let mobileImageUrl: string | null = null;
    if (banner.mobileImageKey) {
      mobileImageUrl = await this.storageService.getPublicUrl(
        banner.mobileImageKey,
      );
    }

    let desktopImageUrl: string | null = null;
    if (banner.desktopImageKey) {
      desktopImageUrl = await this.storageService.getPublicUrl(
        banner.desktopImageKey,
      );
    }

    return {
      ...banner,
      mobileImageUrl,
      desktopImageUrl,
    };
  }
}
