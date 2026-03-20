import { Injectable } from '@nestjs/common';
import { FindAllRolesFiltersDTO } from '../dto';
import { RolesRepository } from '../repository';

@Injectable()
export class FindAllRolesUseCase {
  constructor(private readonly rolesRepository: RolesRepository) {}

  async execute(filters: FindAllRolesFiltersDTO = {}) {
    return this.rolesRepository.findAll(filters);
  }
}
