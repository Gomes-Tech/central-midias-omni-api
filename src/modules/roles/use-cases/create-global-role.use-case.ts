import { BadRequestException } from '@common/filters';
import { Injectable } from '@nestjs/common';
import { CreateGlobalRoleDTO } from '../dto';
import { RolesRepository } from '../repository';

@Injectable()
export class CreateGlobalRoleUseCase {
  constructor(private readonly rolesRepository: RolesRepository) {}

  async execute(data: CreateGlobalRoleDTO) {
    const existingRole = await this.rolesRepository.findByName(data.name);

    if (existingRole) {
      throw new BadRequestException('Já existe um perfil com este nome');
    }

    return this.rolesRepository.createGlobalRole(data);
  }
}
