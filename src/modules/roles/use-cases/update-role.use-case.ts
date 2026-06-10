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

  async execute(id: string, data: UpdateRoleDTO, organizationId: string) {
    const role = await this.findRoleByIdUseCase.execute(id, organizationId);

    if (data.name && data.name !== role.name) {
      const existingRole = await this.rolesRepository.findByName(data.name);

      if (existingRole && existingRole.id !== id) {
        throw new BadRequestException('Já existe um perfil com este nome');
      }
    }

    if (data.categoryRoleAccesses !== undefined) {
      return await this.rolesRepository.updateWithCategoryRoleAccesses(
        id,
        data,
        organizationId,
      );
    }

    return await this.rolesRepository.update(id, data);
  }
}
