import { BadRequestException } from '@common/filters';
import { SyncGlobalRoleCategoryAccessesUseCase } from '@modules/category-role-access/use-cases/sync-global-role-category-accesses.use-case';
import { Injectable } from '@nestjs/common';
import { CreateGlobalRoleDTO } from '../dto';
import { RolesRepository } from '../repository';

@Injectable()
export class CreateGlobalRoleUseCase {
  constructor(
    private readonly rolesRepository: RolesRepository,
    private readonly syncGlobalRoleCategoryAccessesUseCase: SyncGlobalRoleCategoryAccessesUseCase,
  ) {}

  async execute(data: CreateGlobalRoleDTO) {
    const existingRole = await this.rolesRepository.findByName(data.name);

    if (existingRole) {
      throw new BadRequestException('Já existe um perfil com este nome');
    }

    const role = await this.rolesRepository.createGlobalRole(data);

    await this.syncGlobalRoleCategoryAccessesUseCase.executeForAllOrganizations(
      role.id,
    );

    return role;
  }
}
