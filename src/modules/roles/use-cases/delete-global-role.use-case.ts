import { BadRequestException } from '@common/filters';
import { PrismaService } from '@infrastructure/prisma';
import { Injectable } from '@nestjs/common';
import { RolesRepository } from '../repository';
import { FindGlobalRoleByIdUseCase } from './find-global-role-by-id.use-case';

@Injectable()
export class DeleteGlobalRoleUseCase {
  constructor(
    private readonly rolesRepository: RolesRepository,
    private readonly findGlobalRoleByIdUseCase: FindGlobalRoleByIdUseCase,
    private readonly prisma: PrismaService,
  ) {}

  async execute(id: string) {
    const role = await this.findGlobalRoleByIdUseCase.execute(id);

    if (role.isSystem) {
      throw new BadRequestException(
        'Não é possível inativar um perfil global sistema',
      );
    }

    const linkedUsers = await this.prisma.user.count({
      where: {
        globalRoleId: id,
      },
    });

    if (linkedUsers > 0) {
      throw new BadRequestException(
        'Não é possível inativar um perfil global vinculado a usuários',
      );
    }

    await this.rolesRepository.softDeleteGlobalRole(id);
  }
}
