import { BadRequestException } from '@common/filters';
import { Inject, Injectable } from '@nestjs/common';
import { PaginatedResponse } from '../../../types';
import { FindAllBannersFiltersDTO } from '../dto';
import { BannerList } from '../entities';
import { BannerRepository } from '../repository/banner.repository';

@Injectable()
export class ListBannersUseCase {
  constructor(
    @Inject('BannerRepository')
    private readonly bannerRepository: BannerRepository,
  ) {}

  async execute(
    organizationId: string,
    filters: FindAllBannersFiltersDTO = {},
  ): Promise<PaginatedResponse<BannerList>> {
    let parsedInitialDate: Date | undefined;
    let parsedFinishDate: Date | undefined;

    if (filters.initialDate) {
      parsedInitialDate = new Date(filters.initialDate);

      if (Number.isNaN(parsedInitialDate.getTime())) {
        throw new BadRequestException('Data inicial inválida');
      }
    }

    if (filters.finishDate) {
      parsedFinishDate = new Date(filters.finishDate);

      if (Number.isNaN(parsedFinishDate.getTime())) {
        throw new BadRequestException('Data final inválida');
      }
    }

    return await this.bannerRepository.findAll(
      {
        ...filters,
        initialDate: parsedInitialDate,
        finishDate: parsedFinishDate,
      },
      organizationId,
    );
  }
}
