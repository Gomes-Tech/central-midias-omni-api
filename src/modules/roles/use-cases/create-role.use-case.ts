import { BadRequestException } from '@common/filters';
import { Injectable } from '@nestjs/common';
import { CreateRoleDTO } from '../dto';
import { RolesRepository } from '../repository';

@Injectable()
export class CreateRoleUseCase {
  constructor(private readonly rolesRepository: RolesRepository) {}

  async execute(data: CreateRoleDTO) {
    const existingRole = await this.rolesRepository.findByCode(data.name);

    if (existingRole) {
      throw new BadRequestException('Já existe um perfil com este nome');
    }

    return this.rolesRepository.create(data);
  }
}
