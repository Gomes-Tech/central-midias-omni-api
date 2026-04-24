import { NotFoundException } from '@common/filters';
import { Inject, Injectable } from '@nestjs/common';
import { ModuleRepository } from '../repository';

@Injectable()
export class FindModuleByIdUseCase {
  constructor(
    @Inject('ModuleRepository')
    private readonly moduleRepository: ModuleRepository,
  ) {}

  async execute(id: string) {
    const module = await this.moduleRepository.findById(id);

    if (!module) {
      throw new NotFoundException('Módulo não encontrado');
    }

    return module;
  }
}
