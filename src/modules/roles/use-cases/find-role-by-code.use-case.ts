import { NotFoundException } from '@common/filters';
import { Injectable } from '@nestjs/common';
import { RolesRepository } from '../repository';

@Injectable()
export class FindRoleByCodeUseCase {
  constructor(private readonly rolesRepository: RolesRepository) {}

  async execute(roleCode: string) {
    const role = await this.rolesRepository.findByCode(roleCode);

    if (!role) {
      throw new NotFoundException('Perfil não encontrado');
    }

    return role;
  }
}
