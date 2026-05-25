import { BadRequestException } from '@common/filters';
import { Inject, Injectable } from '@nestjs/common';
import { CreateTagDTO } from '../dto';
import { TagRepository } from '../repository';

@Injectable()
export class CreateTagUseCase {
  constructor(
    @Inject('TagRepository')
    private readonly tagRepository: TagRepository,
  ) {}

  async execute(organizationId: string, data: CreateTagDTO) {
    const existingTag = await this.tagRepository.findByName(
      data.name,
      organizationId,
    );

    if (existingTag) {
      throw new BadRequestException('Já existe uma tag com este nome');
    }

    return await this.tagRepository.create(organizationId, data);
  }
}
