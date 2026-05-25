import { BadRequestException } from '@common/filters';
import { Injectable } from '@nestjs/common';
import { TagRepository } from '../repository';
import { FindTagByIdUseCase } from './find-tag-by-id.use-case';

@Injectable()
export class DeleteTagUseCase {
  constructor(
    private readonly tagRepository: TagRepository,
    private readonly findTagByIdUseCase: FindTagByIdUseCase,
  ) {}

  async execute(id: string, organizationId: string) {
    const tag = await this.findTagByIdUseCase.execute(id, organizationId);

    if (tag.materialsCount > 0) {
      throw new BadRequestException(
        'Não é possível remover uma tag vinculada a materiais',
      );
    }

    if (tag.tagSearchesCount > 0) {
      throw new BadRequestException(
        'Não é possível remover uma tag vinculada a buscas',
      );
    }

    await this.tagRepository.delete(id, organizationId);
  }
}
