import { BadRequestException } from '@common/filters';
import { Injectable } from '@nestjs/common';
import { RolesRepository } from '@modules/roles';
import { UserRolesRepository } from '../repository';

@Injectable()
export class ReplaceUserRolesUseCase {
  constructor(
    private readonly userRolesRepository: UserRolesRepository,
    private readonly rolesRepository: RolesRepository,
  ) {}

  async execute(userId: string, roleCodes: string[], companyIds: string[] = []) {
    const normalizedRoles = [...new Set(roleCodes)];
    const normalizedCompanyIds = [...new Set(companyIds)];

    if (!normalizedRoles.length) {
      return this.userRolesRepository.replaceByUserId(userId, []);
    }

    if (!normalizedCompanyIds.length) {
      throw new BadRequestException(
        'É necessário informar ao menos uma empresa para vincular perfis ao usuário',
      );
    }

    const roles = await this.rolesRepository.findByCodes(normalizedRoles);

    if (roles.length !== normalizedRoles.length) {
      throw new BadRequestException(
        'Uma ou mais funções informadas não existem',
      );
    }

    const activeCompanyIds =
      await this.userRolesRepository.findActiveCompanyIds(normalizedCompanyIds);

    if (activeCompanyIds.length !== normalizedCompanyIds.length) {
      throw new BadRequestException(
        'Uma ou mais empresas informadas não existem',
      );
    }

    const assignments = activeCompanyIds.flatMap((companyId) =>
      roles.map((role) => ({
        roleId: role.id,
        companyId,
      })),
    );

    return this.userRolesRepository.replaceByUserId(userId, assignments);
  }
}
