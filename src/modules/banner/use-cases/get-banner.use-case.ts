import { NotFoundException } from '@common/filters';
import { Inject, Injectable } from '@nestjs/common';
import { BannerRepository } from '../repository/banner.repository';

@Injectable()
export class GetBannerUseCase {
  constructor(
    @Inject('BannerRepository')
    private readonly bannerRepository: BannerRepository,
  ) {}

  async execute(id: string, organizationId: string) {
    const banner = await this.bannerRepository.findById(id, organizationId);

    if (!banner) {
      throw new NotFoundException('Banner não encontrado');
    }

    return banner;
  }
}
