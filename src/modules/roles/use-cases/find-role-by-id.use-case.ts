import { NotFoundException } from '@common/filters';
import { Injectable } from '@nestjs/common';
import { RolesRepository } from '../repository';

@Injectable()
export class FindRoleByIdUseCase {
  constructor(private readonly rolesRepository: RolesRepository) {}

  async execute(id: string) {
    const role = await this.rolesRepository.findById(id);

    if (!role) {
      throw new NotFoundException('Perfil não encontrado');
    }

    return role;
  }
}
