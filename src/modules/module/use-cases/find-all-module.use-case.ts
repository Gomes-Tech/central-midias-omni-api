import { Inject, Injectable } from '@nestjs/common';
import { ModuleRepository } from '../repository';

@Injectable()
export class FindAllModuleUseCase {
  constructor(
    @Inject('ModuleRepository')
    private readonly moduleRepository: ModuleRepository,
  ) {}

  async execute() {
    return await this.moduleRepository.findAll();
  }
}
