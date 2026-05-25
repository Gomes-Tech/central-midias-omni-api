import { Injectable } from '@nestjs/common';
import { RolesRepository } from '../repository';

@Injectable()
export class FindAllSelectRolesUseCase {
  constructor(private readonly rolesRepository: RolesRepository) {}

  async execute(isMember: boolean = false) {
    return this.rolesRepository.findAllSelect(isMember);
  }
}
