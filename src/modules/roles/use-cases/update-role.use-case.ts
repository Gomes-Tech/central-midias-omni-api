import { BadRequestException } from '@common/filters';
import { Injectable } from '@nestjs/common';
import { UpdateRoleDTO } from '../dto';
import { RolesRepository } from '../repository';
import { FindRoleByIdUseCase } from './find-role-by-id.use-case';

@Injectable()
export class UpdateRoleUseCase {
  constructor(
    private readonly rolesRepository: RolesRepository,
    private readonly findRoleByIdUseCase: FindRoleByIdUseCase,
  ) {}

  async execute(id: string, data: UpdateRoleDTO) {
    const role = await this.findRoleByIdUseCase.execute(id);

    if (data.name && data.name !== role.name) {
      const existingRole = await this.rolesRepository.findByCode(data.name);

      if (existingRole && existingRole.id !== id) {
        throw new BadRequestException('Já existe um perfil com este nome');
      }
    }

    return this.rolesRepository.update(id, data);
  }
}
