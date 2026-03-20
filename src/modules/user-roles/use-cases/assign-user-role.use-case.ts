import { BadRequestException } from '@common/filters';
import { Injectable } from '@nestjs/common';
import { FindRoleByIdUseCase } from '@modules/roles';
import { UserRolesRepository } from '../repository';

@Injectable()
export class AssignUserRoleUseCase {
  constructor(
    private readonly userRolesRepository: UserRolesRepository,
    private readonly findRoleByIdUseCase: FindRoleByIdUseCase,
  ) {}

  async execute(userId: string, roleId: string, companyId: string) {
    await this.findRoleByIdUseCase.execute(roleId);

    const activeCompanyIds =
      await this.userRolesRepository.findActiveCompanyIds([companyId]);

    if (!activeCompanyIds.length) {
      throw new BadRequestException('Empresa inválida');
    }

    return this.userRolesRepository.assign(userId, roleId, companyId);
  }
}
