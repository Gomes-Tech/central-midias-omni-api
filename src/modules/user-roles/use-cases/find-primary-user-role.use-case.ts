import { NotFoundException } from '@common/filters';
import { Injectable } from '@nestjs/common';
import { getHighestUserRole } from 'types/role';
import { UserRolesRepository } from '../repository';

@Injectable()
export class FindPrimaryUserRoleUseCase {
  constructor(private readonly userRolesRepository: UserRolesRepository) {}

  async execute(userId: string) {
    const roles = await this.userRolesRepository.findRoleCodesByUserId(userId);
    const primaryRole = getHighestUserRole(roles);

    if (!primaryRole) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return primaryRole;
  }
}
