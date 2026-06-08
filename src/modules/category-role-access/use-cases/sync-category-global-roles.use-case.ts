import { Inject, Injectable } from '@nestjs/common';
import { CategoryRoleAccessRepository } from '../repository';

@Injectable()
export class SyncCategoryGlobalRolesUseCase {
  constructor(
    @Inject('CategoryRoleAccessRepository')
    private readonly categoryRoleAccessRepository: CategoryRoleAccessRepository,
  ) {}

  async execute(categoryId: string, organizationId: string): Promise<void> {
    await this.categoryRoleAccessRepository.syncCategoryWithGlobalRolesInOrganization(
      categoryId,
      organizationId,
    );
  }
}
