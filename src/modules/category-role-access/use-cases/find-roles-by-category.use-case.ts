import { NotFoundException } from '@common/filters';
import { Inject, Injectable } from '@nestjs/common';
import { CategoryRoleAccessRepository } from '../repository';

type FindRolesByCategoryResult = {
  isUnrestricted: boolean;
  roles: {
    id: string;
    name: string;
    label: string;
  }[];
};

@Injectable()
export class FindRolesByCategoryUseCase {
  constructor(
    @Inject('CategoryRoleAccessRepository')
    private readonly categoryRoleAccessRepository: CategoryRoleAccessRepository,
  ) {}

  async execute(
    categoryId: string,
    organizationId: string,
  ): Promise<FindRolesByCategoryResult> {
    const category =
      await this.categoryRoleAccessRepository.findActiveCategoryInOrganization(
        categoryId,
        organizationId,
      );

    if (!category) {
      throw new NotFoundException('Categoria não encontrada');
    }

    const roleIds =
      await this.categoryRoleAccessRepository.findRoleIdsByCategoryAndOrganization(
        categoryId,
        organizationId,
      );

    if (roleIds.length === 0) {
      return { isUnrestricted: true, roles: [] };
    }

    const roles =
      await this.categoryRoleAccessRepository.findRolesByIds(roleIds);

    return { isUnrestricted: false, roles };
  }
}
