import { BadRequestException } from '@common/filters';
import { Inject, Injectable } from '@nestjs/common';
import { PaginatedResponse } from '../../../types';
import { FindAllSocialHighlightsFiltersDTO } from '../dto';
import { SocialHighlightList } from '../entities';
import { SocialHighlightRepository } from '../repository/social-highlight.repository';

@Injectable()
export class FindAllSocialHighlightsUseCase {
  constructor(
    @Inject('SocialHighlightRepository')
    private readonly socialHighlightRepository: SocialHighlightRepository,
  ) {}

  async execute(
    organizationId: string,
    filters: FindAllSocialHighlightsFiltersDTO = {},
  ): Promise<PaginatedResponse<SocialHighlightList>> {
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

    return await this.socialHighlightRepository.findAll(
      {
        ...filters,
        initialDate: parsedInitialDate,
        finishDate: parsedFinishDate,
      },
      organizationId,
    );
  }
}
