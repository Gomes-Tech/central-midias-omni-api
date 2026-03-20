import { LoggerService } from '@infrastructure/log';
import { PrismaService } from '@infrastructure/prisma';
import {
  HttpException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CreateRoleDTO, FindAllRolesFiltersDTO, UpdateRoleDTO } from '../dto';
import { Role } from '../entities';

type PrismaRole = Prisma.RolesGetPayload<Record<string, never>>;

@Injectable()
export class RolesRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  async findAll(filters: FindAllRolesFiltersDTO = {}): Promise<Role[]> {
    try {
      const roles = await this.prisma.roles.findMany({
        where: filters.includeDeleted ? undefined : { deletedAt: null },
        orderBy: [{ label: 'asc' }, { role: 'asc' }],
      });

      return roles.map((role) => this.toRole(role));
    } catch (error) {
      this.handleError('RolesRepository.findAll falhou', error, { filters });
    }
  }

  async findById(id: string): Promise<Role | null> {
    try {
      const role = await this.prisma.roles.findUnique({
        where: { id },
      });

      return role ? this.toRole(role) : null;
    } catch (error) {
      this.handleError('RolesRepository.findById falhou', error, { id });
    }
  }

  async findByCode(roleCode: string): Promise<Role | null> {
    try {
      const role = await this.prisma.roles.findFirst({
        where: {
          role: roleCode,
          deletedAt: null,
        },
      });

      return role ? this.toRole(role) : null;
    } catch (error) {
      this.handleError('RolesRepository.findByCode falhou', error, {
        roleCode,
      });
    }
  }

  async findByCodes(roleCodes: string[]): Promise<Role[]> {
    try {
      if (!roleCodes.length) {
        return [];
      }

      const roles = await this.prisma.roles.findMany({
        where: {
          role: {
            in: [...new Set(roleCodes)],
          },
          deletedAt: null,
        },
      });

      return roles.map((role) => this.toRole(role));
    } catch (error) {
      this.handleError('RolesRepository.findByCodes falhou', error, {
        roleCodes,
      });
    }
  }

  async create(data: CreateRoleDTO): Promise<Role> {
    try {
      const role = await this.prisma.roles.create({
        data: {
          label: data.label,
          role: data.role,
        },
      });

      void this.logger.info('Perfil criado', {
        roleId: role.id,
        role: role.role,
      });

      return this.toRole(role);
    } catch (error) {
      this.handleError('RolesRepository.create falhou', error, {
        role: data.role,
      });
    }
  }

  async update(id: string, data: UpdateRoleDTO): Promise<Role> {
    try {
      const role = await this.prisma.roles.update({
        where: { id },
        data: {
          ...(data.label !== undefined && { label: data.label }),
          ...(data.role !== undefined && { role: data.role }),
        },
      });

      void this.logger.info('Perfil atualizado', {
        roleId: id,
      });

      return this.toRole(role);
    } catch (error) {
      this.handleError('RolesRepository.update falhou', error, {
        roleId: id,
      });
    }
  }

  async softDelete(id: string): Promise<void> {
    try {
      await this.prisma.roles.update({
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

  private toRole(role: PrismaRole): Role {
    return {
      id: role.id,
      label: role.label,
      role: role.role,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      deletedAt: role.deletedAt,
    };
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
