import { BadRequestException } from '@common/filters';
import { Injectable } from '@nestjs/common';
import { UpdateGlobalRoleDTO } from '../dto';
import { RolesRepository } from '../repository';
import { FindGlobalRoleByIdUseCase } from './find-global-role-by-id.use-case';

@Injectable()
export class UpdateGlobalRoleUseCase {
  constructor(
    private readonly rolesRepository: RolesRepository,
    private readonly findGlobalRoleByIdUseCase: FindGlobalRoleByIdUseCase,
  ) {}

  async execute(id: string, data: UpdateGlobalRoleDTO) {
    const role = await this.findGlobalRoleByIdUseCase.execute(id);

    if (data.name && data.name !== role.name) {
      const existingRole = await this.rolesRepository.findByName(data.name);

      if (existingRole && existingRole.id !== id) {
        throw new BadRequestException('Já existe um perfil com este nome');
      }
    }

    return this.rolesRepository.updateGlobalRole(id, data);
  }
}
