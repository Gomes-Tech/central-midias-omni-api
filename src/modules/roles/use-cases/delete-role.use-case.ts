import { BadRequestException } from '@common/filters';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/prisma';
import { FindRoleByIdUseCase } from './find-role-by-id.use-case';
import { RolesRepository } from '../repository';

@Injectable()
export class DeleteRoleUseCase {
  constructor(
    private readonly rolesRepository: RolesRepository,
    private readonly findRoleByIdUseCase: FindRoleByIdUseCase,
    private readonly prisma: PrismaService,
  ) {}

  async execute(id: string) {
    await this.findRoleByIdUseCase.execute(id);

    const linkedUsers = await this.prisma.userRole.count({
      where: {
        roleId: id,
      },
    });

    if (linkedUsers > 0) {
      throw new BadRequestException(
        'Não é possível inativar um perfil vinculado a usuários',
      );
    }

    await this.rolesRepository.softDelete(id);
  }
}
