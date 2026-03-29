import { BadRequestException, NotFoundException } from '@common/filters';
import { Inject, Injectable } from '@nestjs/common';
import { CreateCategoryRoleAccessDTO } from '../dto/create-category-role-access.dto';
import { CategoryRoleAccessRepository } from '../repository';

@Injectable()
export class CreateCategoryRoleAccessUseCase {
  constructor(
    @Inject('CategoryRoleAccessRepository')
    private readonly categoryRoleAccessRepository: CategoryRoleAccessRepository,
  ) {}

  async execute(organizationId: string, dto: CreateCategoryRoleAccessDTO) {
    const category =
      await this.categoryRoleAccessRepository.findActiveCategoryInOrganization(
        dto.categoryId,
        organizationId,
      );

    if (!category) {
      throw new NotFoundException('Categoria não encontrada');
    }

    const role = await this.categoryRoleAccessRepository.findActiveRole(
      dto.roleId,
    );

    if (!role) {
      throw new NotFoundException('Perfil não encontrado');
    }

    const existing =
      await this.categoryRoleAccessRepository.findByCategoryRoleAndOrganization(
        dto.categoryId,
        dto.roleId,
        organizationId,
      );

    if (existing) {
      throw new BadRequestException(
        'Este perfil já possui acesso a esta categoria',
      );
    }

    return await this.categoryRoleAccessRepository.create(organizationId, dto);
  }
}
