import { BadRequestException } from '@common/filters';
import { Injectable } from '@nestjs/common';
import { CreateRoleDTO } from '../dto';
import { RolesRepository } from '../repository';

@Injectable()
export class CreateRoleUseCase {
  constructor(private readonly rolesRepository: RolesRepository) {}

  async execute(data: CreateRoleDTO) {
    const existingRole = await this.rolesRepository.findByCode(data.role);

    if (existingRole) {
      throw new BadRequestException('Já existe um perfil com este código');
    }

    return this.rolesRepository.create(data);
  }
}
