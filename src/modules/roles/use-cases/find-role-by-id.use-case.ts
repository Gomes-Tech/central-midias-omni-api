import { NotFoundException } from '@common/filters';
import { Inject, Injectable } from '@nestjs/common';
import { RolesRepository } from '../repository';

@Injectable()
export class FindRoleByIdUseCase {
  constructor(
    @Inject('RolesRepository')
    private readonly rolesRepository: RolesRepository,
  ) {}

  async execute(id: string, organizationId: string) {
    const role = await this.rolesRepository.findById(id, organizationId);

    if (!role) {
      throw new NotFoundException('Perfil não encontrado');
    }

    return role;
  }
}
