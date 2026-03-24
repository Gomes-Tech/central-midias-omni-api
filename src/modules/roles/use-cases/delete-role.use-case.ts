import { BadRequestException } from '@common/filters';
import { PrismaService } from '@infrastructure/prisma';
import { Injectable } from '@nestjs/common';
import { RolesRepository } from '../repository';
import { FindRoleByIdUseCase } from './find-role-by-id.use-case';

@Injectable()
export class DeleteRoleUseCase {
  constructor(
    private readonly rolesRepository: RolesRepository,
    private readonly findRoleByIdUseCase: FindRoleByIdUseCase,
    private readonly prisma: PrismaService,
  ) {}

  async execute(id: string) {
    await this.findRoleByIdUseCase.execute(id);

    const linkedUsers = await this.prisma.platformRole.count({
      where: {
        id: id,
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
