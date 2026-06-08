import { NotFoundException } from '@common/filters';
import { Injectable } from '@nestjs/common';
import { RolesRepository } from '../repository';

@Injectable()
export class FindGlobalRoleByIdUseCase {
  constructor(private readonly rolesRepository: RolesRepository) {}

  async execute(id: string) {
    const role = await this.rolesRepository.findGlobalRoleById(id);

    if (!role) {
      throw new NotFoundException('Perfil global não encontrado');
    }

    return role;
  }
}
