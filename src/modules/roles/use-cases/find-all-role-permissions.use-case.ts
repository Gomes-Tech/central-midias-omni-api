import { Injectable } from '@nestjs/common';
import { FindAllRolePermissionsFiltersDTO } from '../dto';
import { RolePermissionListResponse } from '../entities';
import { RolesRepository } from '../repository';

@Injectable()
export class FindAllRolePermissionsUseCase {
  constructor(private readonly rolesRepository: RolesRepository) {}

  async execute(
    organizationId: string,
    filters: FindAllRolePermissionsFiltersDTO = {},
  ): Promise<RolePermissionListResponse> {
    return await this.rolesRepository.findAllPermissions(
      organizationId,
      filters,
    );
  }
}
