import { BadRequestException } from '@common/filters';
import { generateId } from '@common/utils';
import { LoggerService } from '@infrastructure/log';
import { PrismaService } from '@infrastructure/prisma';
import {
  HttpException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { Action } from '@prisma/client';
import { CreateRoleDTO, FindAllRolesFiltersDTO, UpdateRoleDTO } from '../dto';
import { CreateGlobalRoleDTO } from '../dto/create-global-role.dto';
import { Role } from '../entities';

@Injectable()
export class RolesRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  async findAll(filters: FindAllRolesFiltersDTO = {}): Promise<Role[]> {
    try {
      const roles = await this.prisma.role.findMany({
        where: { deletedAt: null },
        orderBy: [{ label: 'asc' }],
      });

      return roles;
    } catch (error) {
      this.handleError('RolesRepository.findAll falhou', error, { filters });
    }
  }

  async findAllSelect(): Promise<{ id: string; name: string }[]> {
    try {
      const roles = await this.prisma.role.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          name: true,
        },
        orderBy: [{ label: 'asc' }],
      });

      return roles;
    } catch (error) {
      this.handleError('RolesRepository.findAllSelect falhou', error);
    }
  }

  async findById(id: string): Promise<Role | null> {
    try {
      const role = await this.prisma.role.findUnique({
        where: { id },
      });

      return role;
    } catch (error) {
      this.handleError('RolesRepository.findById falhou', error, { id });
    }
  }

  async findByName(name: string): Promise<Role | null> {
    try {
      const role = await this.prisma.role.findFirst({
        where: {
          name,
          deletedAt: null,
        },
      });

      return role;
    } catch (error) {
      this.handleError('RolesRepository.findByCode falhou', error, {
        name,
      });
    }
  }

  async findByCodes(roleCodes: string[]): Promise<Role[]> {
    try {
      if (!roleCodes.length) {
        return [];
      }

      const roles = await this.prisma.role.findMany({
        where: {
          name: {
            in: [...new Set(roleCodes)],
          },
          deletedAt: null,
        },
      });

      return roles;
    } catch (error) {
      this.handleError('RolesRepository.findByCodes falhou', error, {
        roleCodes,
      });
    }
  }

  async create(data: CreateRoleDTO): Promise<{ id: string; name: string }> {
    try {
      const role = await this.prisma.role.create({
        data: {
          label: data.label,
          name: data.name,
          canHaveSubordinates: data.canHaveSubordinates,
        },
        select: {
          id: true,
          name: true,
        },
      });

      void this.logger.info('Perfil criado', {
        roleId: role.id,
        role: role.name,
      });

      return role;
    } catch (error) {
      this.handleError('RolesRepository.create falhou', error, {
        role: data.name,
      });
    }
  }

  async createGlobalRole(data: CreateGlobalRoleDTO): Promise<void> {
    try {
      const role = await this.prisma.$transaction(async (tx) => {
        const role = await tx.role.create({
          data: {
            id: generateId(),
            label: data.label,
            name: data.name,
            canAccessBackoffice: true,
          },
          select: {
            id: true,
          },
        });

        const permissions = data.permissions.map((permission) => ({
          id: generateId(),
          roleId: role.id,
          moduleId: permission.moduleId,
          action: permission.action as Action,
        }));

        await tx.rolePermission.createMany({ data: permissions });

        return role;
      });

      void this.logger.info('Perfil global criado', {
        roleId: role.id,
      });
    } catch (error) {
      void this.logger.error('RolesRepository.createGlobalRole falhou', {
        error: String(error),
      });
      throw new BadRequestException('Erro ao criar perfil global');
    }
  }

  async update(id: string, data: UpdateRoleDTO): Promise<Role> {
    try {
      const role = await this.prisma.role.update({
        where: { id },
        data: {
          ...(data.label !== undefined && { label: data.label }),
          ...(data.name !== undefined && { name: data.name }),
          ...(data.canAccessBackoffice !== undefined && {
            canAccessBackoffice: data.canAccessBackoffice,
          }),
          ...(data.canHaveSubordinates !== undefined && {
            canHaveSubordinates: data.canHaveSubordinates,
          }),
        },
      });

      void this.logger.info('Perfil atualizado', {
        roleId: id,
      });

      return role;
    } catch (error) {
      this.handleError('RolesRepository.update falhou', error, {
        roleId: id,
      });
    }
  }

  async softDelete(id: string): Promise<void> {
    try {
      await this.prisma.role.update({
        where: { id },
        data: {
          deletedAt: new Date(),
        },
      });

      void this.logger.info('Perfil inativado', { roleId: id });
    } catch (error) {
      this.handleError('RolesRepository.softDelete falhou', error, {
        roleId: id,
      });
    }
  }

  private handleError(
    message: string,
    error: unknown,
    metadata?: object,
  ): never {
    if (error instanceof HttpException) {
      throw error;
    }

    void this.logger.error(message, {
      ...metadata,
      error: String(error),
    });

    throw new InternalServerErrorException(error);
  }
}
