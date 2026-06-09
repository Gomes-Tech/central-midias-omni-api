import { Inject, Injectable } from '@nestjs/common';
import { PaginatedResponse } from '../../../types';
import { FindAllTagsFiltersDTO } from '../dto';
import { TagEntity } from '../entities';
import { TagRepository } from '../repository';

@Injectable()
export class FindAllTagsUseCase {
  constructor(
    @Inject('TagRepository')
    private readonly tagRepository: TagRepository,
  ) {}

  async execute(
    organizationId: string,
    filters: FindAllTagsFiltersDTO = {},
  ): Promise<PaginatedResponse<TagEntity>> {
    return await this.tagRepository.findAll(filters, organizationId);
  }
}
