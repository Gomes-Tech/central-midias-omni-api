import { NotFoundException } from '@common/filters';
import { Inject, Injectable } from '@nestjs/common';
import { TagRepository } from '../repository';

@Injectable()
export class FindTagByIdUseCase {
  constructor(
    @Inject('TagRepository')
    private readonly tagRepository: TagRepository,
  ) {}

  async execute(id: string, organizationId: string) {
    const tag = await this.tagRepository.findById(id, organizationId);

    if (!tag) {
      throw new NotFoundException('Tag não encontrada');
    }

    return tag;
  }
}
