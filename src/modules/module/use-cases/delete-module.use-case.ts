import { BadRequestException } from '@common/filters';
import { PrismaService } from '@infrastructure/prisma';
import { Injectable } from '@nestjs/common';
import { ModuleRepository } from '../repository';
import { FindModuleByIdUseCase } from './find-module-by-id.use-case';

@Injectable()
export class DeleteModuleUseCase {
  constructor(
    private readonly moduleRepository: ModuleRepository,
    private readonly findModuleByIdUseCase: FindModuleByIdUseCase,
    private readonly prisma: PrismaService,
  ) {}

  async execute(id: string) {
    await this.findModuleByIdUseCase.execute(id);

    const linkedPermissions = await this.prisma.rolePermission.count({
      where: { moduleId: id },
    });

    if (linkedPermissions > 0) {
      throw new BadRequestException(
        'Não é possível remover um módulo vinculado a permissões',
      );
    }

    await this.moduleRepository.delete(id);
  }
}
