import { Inject, Injectable } from '@nestjs/common';
import { TagRepository } from '../repository';

@Injectable()
export class FindSelectTagsUseCase {
  constructor(
    @Inject('TagRepository')
    private readonly tagRepository: TagRepository,
  ) {}

  async execute(organizationId: string) {
    return await this.tagRepository.findSelect(organizationId);
  }
}
