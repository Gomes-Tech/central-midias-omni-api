import { Inject, Injectable } from '@nestjs/common';
import { CategoryRoleAccessRepository } from '../repository';

@Injectable()
export class SyncGlobalRoleCategoryAccessesUseCase {
  constructor(
    @Inject('CategoryRoleAccessRepository')
    private readonly categoryRoleAccessRepository: CategoryRoleAccessRepository,
  ) {}

  async execute(roleId: string, organizationId: string): Promise<void> {
    await this.categoryRoleAccessRepository.syncGlobalRoleWithOrganizationCategories(
      roleId,
      organizationId,
    );
  }

  async executeForAllOrganizations(roleId: string): Promise<void> {
    const organizationIds =
      await this.categoryRoleAccessRepository.findAllActiveOrganizationIds();

    await Promise.all(
      organizationIds.map((organizationId) =>
        this.categoryRoleAccessRepository.syncGlobalRoleWithOrganizationCategories(
          roleId,
          organizationId,
        ),
      ),
    );
  }

  async executeForAllExistingGlobalRoles(): Promise<{
    roleCount: number;
    organizationCount: number;
  }> {
    const [roleIds, organizationIds] = await Promise.all([
      this.categoryRoleAccessRepository.findAllActiveGlobalRoleIds(),
      this.categoryRoleAccessRepository.findAllActiveOrganizationIds(),
    ]);

    await Promise.all(
      roleIds.map((roleId) =>
        Promise.all(
          organizationIds.map((organizationId) =>
            this.categoryRoleAccessRepository.syncGlobalRoleWithOrganizationCategories(
              roleId,
              organizationId,
            ),
          ),
        ),
      ),
    );

    return {
      roleCount: roleIds.length,
      organizationCount: organizationIds.length,
    };
  }
}
