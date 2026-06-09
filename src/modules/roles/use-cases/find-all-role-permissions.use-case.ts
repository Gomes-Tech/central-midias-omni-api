import { Injectable } from '@nestjs/common';
import { PaginatedResponse } from '../../../types';
import { FindAllRolePermissionsFiltersDTO } from '../dto';
import { RolePermissionList } from '../entities';
import { RolesRepository } from '../repository';

@Injectable()
export class FindAllRolePermissionsUseCase {
  constructor(private readonly rolesRepository: RolesRepository) {}

  async execute(
    organizationId: string,
    filters: FindAllRolePermissionsFiltersDTO = {},
  ): Promise<PaginatedResponse<RolePermissionList>> {
    return await this.rolesRepository.findAllPermissions(
      organizationId,
      filters,
    );
  }
}
