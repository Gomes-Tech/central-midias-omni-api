import { BadRequestException } from '@common/filters';
import { Injectable } from '@nestjs/common';
import { UpdateModuleDTO } from '../dto';
import { ModuleRepository } from '../repository';
import { FindModuleByIdUseCase } from './find-module-by-id.use-case';

@Injectable()
export class UpdateModuleUseCase {
  constructor(
    private readonly moduleRepository: ModuleRepository,
    private readonly findModuleByIdUseCase: FindModuleByIdUseCase,
  ) {}

  async execute(id: string, data: UpdateModuleDTO) {
    await this.findModuleByIdUseCase.execute(id);

    if (data.name) {
      const existingModule = await this.moduleRepository.findByName(data.name);
      if (existingModule && existingModule.id !== id) {
        throw new BadRequestException('Já existe um módulo com este nome');
      }
    }

    return await this.moduleRepository.update(id, data);
  }
}
