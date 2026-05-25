import { Inject, Injectable } from '@nestjs/common';
import { FindAllTagsFiltersDTO } from '../dto';
import { TagRepository } from '../repository';

@Injectable()
export class FindAllTagsUseCase {
  constructor(
    @Inject('TagRepository')
    private readonly tagRepository: TagRepository,
  ) {}

  async execute(organizationId: string, filters: FindAllTagsFiltersDTO = {}) {
    return await this.tagRepository.findAll(organizationId, filters);
  }
}
