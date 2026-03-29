import { Inject, Injectable } from '@nestjs/common';
import { CategoryRoleAccessRepository } from '../repository';

@Injectable()
export class FindAllCategoryRoleAccessesUseCase {
  constructor(
    @Inject('CategoryRoleAccessRepository')
    private readonly categoryRoleAccessRepository: CategoryRoleAccessRepository,
  ) {}

  async execute(organizationId: string) {
    return await this.categoryRoleAccessRepository.findAllByOrganization(
      organizationId,
    );
  }
}
