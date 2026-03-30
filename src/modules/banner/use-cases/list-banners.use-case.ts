import { BadRequestException } from '@common/filters';
import { Inject, Injectable } from '@nestjs/common';
import { BannerRepository } from '../repository/banner.repository';

@Injectable()
export class ListBannersUseCase {
  constructor(
    @Inject('BannerRepository')
    private readonly bannerRepository: BannerRepository,
  ) {}

  async execute(organizationId: string, referenceDate?: string) {
    let parsedReferenceDate: Date | undefined;

    if (referenceDate) {
      parsedReferenceDate = new Date(referenceDate);

      if (Number.isNaN(parsedReferenceDate.getTime())) {
        throw new BadRequestException('Data de referência inválida');
      }
    }

    return await this.bannerRepository.findAll({
      organizationId,
      onlyActive: true,
      referenceDate: parsedReferenceDate,
    });
  }
}
