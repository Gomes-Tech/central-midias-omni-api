import { BadRequestException } from '@common/filters';
import { Injectable } from '@nestjs/common';
import { UpdateTagDTO } from '../dto';
import { TagRepository } from '../repository';
import { FindTagByIdUseCase } from './find-tag-by-id.use-case';

@Injectable()
export class UpdateTagUseCase {
  constructor(
    private readonly tagRepository: TagRepository,
    private readonly findTagByIdUseCase: FindTagByIdUseCase,
  ) {}

  async execute(id: string, organizationId: string, data: UpdateTagDTO) {
    const tag = await this.findTagByIdUseCase.execute(id, organizationId);

    if (data.name) {
      const existingTag = await this.tagRepository.findByName(
        data.name,
        organizationId,
      );

      if (existingTag && existingTag.id !== id) {
        throw new BadRequestException('Já existe uma tag com este nome');
      }

      if (existingTag && existingTag.id === id) {
        return tag;
      }
    }

    return await this.tagRepository.update(id, organizationId, data);
  }
}
