import { BadRequestException } from '@common/filters';
import { LoggerService } from '@infrastructure/log';
import { PrismaService } from '@infrastructure/prisma';
import { Injectable } from '@nestjs/common';
import { CreateModuleDTO, UpdateModuleDTO } from '../dto';
import { ModuleEntity } from '../entities';

@Injectable()
export class ModuleRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  async findAll(): Promise<ModuleEntity[]> {
    try {
      return await this.prisma.module.findMany({
        orderBy: [{ label: 'asc' }],
      });
    } catch (error) {
      void this.logger.error('ModuleRepository.findAll falhou', {
        error: String(error),
      });
      throw new BadRequestException('Erro ao buscar módulos');
    }
  }

  async findAllSelect(): Promise<{ id: string; name: string }[]> {
    try {
      return await this.prisma.module.findMany({
        select: { id: true, name: true },
        orderBy: [{ label: 'asc' }],
      });
    } catch (error) {
      void this.logger.error('ModuleRepository.findAllSelect falhou', {
        error: String(error),
      });
      throw new BadRequestException('Erro ao buscar módulos');
    }
  }

  async findById(id: string): Promise<ModuleEntity | null> {
    try {
      return await this.prisma.module.findUnique({
        where: { id },
      });
    } catch (error) {
      void this.logger.error('ModuleRepository.findById falhou', {
        error: String(error),
        id,
      });
      throw new BadRequestException('Erro ao buscar módulo');
    }
  }

  async findByName(name: string): Promise<ModuleEntity | null> {
    try {
      return await this.prisma.module.findUnique({
        where: { name },
      });
    } catch (error) {
      void this.logger.error('ModuleRepository.findByName falhou', {
        error: String(error),
        name,
      });
      throw new BadRequestException('Erro ao buscar módulo');
    }
  }

  async create(data: CreateModuleDTO): Promise<ModuleEntity> {
    try {
      const createdModule = await this.prisma.module.create({
        data: {
          name: data.name,
          label: data.label,
        },
      });

      void this.logger.info('Módulo criado', {
        moduleId: createdModule.id,
        moduleName: createdModule.name,
      });

      return createdModule;
    } catch (error) {
      void this.logger.error('ModuleRepository.create falhou', {
        error: String(error),
        data,
      });
      throw new BadRequestException('Erro ao criar módulo');
    }
  }

  async update(id: string, data: UpdateModuleDTO): Promise<ModuleEntity> {
    try {
      const updatedModule = await this.prisma.module.update({
        where: { id },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.label !== undefined && { label: data.label }),
        },
      });

      void this.logger.info('Módulo atualizado', {
        moduleId: updatedModule.id,
      });

      return updatedModule;
    } catch (error) {
      void this.logger.error('ModuleRepository.update falhou', {
        error: String(error),
        id,
        data,
      });
      throw new BadRequestException('Erro ao atualizar módulo');
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.module.delete({
        where: { id },
      });

      void this.logger.info('Módulo removido', {
        moduleId: id,
      });
    } catch (error) {
      void this.logger.error('ModuleRepository.delete falhou', {
        error: String(error),
        id,
      });
      throw new BadRequestException('Erro ao remover módulo');
    }
  }
}
