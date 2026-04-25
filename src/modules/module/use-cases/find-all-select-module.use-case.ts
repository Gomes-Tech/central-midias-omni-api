import { Inject, Injectable } from '@nestjs/common';
import { ModuleRepository } from '../repository';

@Injectable()
export class FindAllSelectModuleUseCase {
  constructor(
    @Inject('ModuleRepository')
    private readonly moduleRepository: ModuleRepository,
  ) {}

  async execute() {
    return await this.moduleRepository.findAllSelect();
  }
}
