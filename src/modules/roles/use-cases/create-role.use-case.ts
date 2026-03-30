import { BadRequestException } from '@common/filters';
import { CreateCategoryRoleAccessUseCase } from '@modules/category-role-access/use-cases/create-category-role-access.use-case';
import { Injectable } from '@nestjs/common';
import { CreateRoleDTO } from '../dto';
import { RolesRepository } from '../repository';

@Injectable()
export class CreateRoleUseCase {
  constructor(
    private readonly rolesRepository: RolesRepository,
    private readonly createCategoryRoleAccessUseCase: CreateCategoryRoleAccessUseCase,
  ) {}

  async execute(data: CreateRoleDTO, organizationId: string): Promise<void> {
    const existingRole = await this.rolesRepository.findByName(data.name);

    if (existingRole) {
      throw new BadRequestException('Já existe um perfil com este nome');
    }

    const role = await this.rolesRepository.create(data);

    for (const categoryRoleAccess of data.categoryRoleAccesses) {
      await this.createCategoryRoleAccessUseCase.execute(organizationId, {
        categoryId: categoryRoleAccess.categoryId,
        roleId: role.id,
      });
    }
  }
}
