import { NotFoundException } from '@common/filters';
import { Injectable } from '@nestjs/common';
import { RolesRepository } from '../repository';

@Injectable()
export class FindRoleByNameUseCase {
  constructor(private readonly rolesRepository: RolesRepository) {}

  async execute(name: string) {
    const role = await this.rolesRepository.findByName(name);

    if (!role) {
      throw new NotFoundException('Perfil não encontrado');
    }

    return role;
  }
}
