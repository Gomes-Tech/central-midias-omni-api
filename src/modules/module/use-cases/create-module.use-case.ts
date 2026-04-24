import { BadRequestException } from '@common/filters';
import { Injectable } from '@nestjs/common';
import { CreateModuleDTO } from '../dto';
import { ModuleRepository } from '../repository';

@Injectable()
export class CreateModuleUseCase {
  constructor(private readonly moduleRepository: ModuleRepository) {}

  async execute(data: CreateModuleDTO) {
    const existingModule = await this.moduleRepository.findByName(data.name);

    if (existingModule) {
      throw new BadRequestException('Já existe um módulo com este nome');
    }

    return await this.moduleRepository.create(data);
  }
}
