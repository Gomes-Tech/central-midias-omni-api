import { LoggerService } from '@infrastructure/log';
import { PrismaService } from '@infrastructure/prisma';
import {
  HttpException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { CreateRoleDTO, FindAllRolesFiltersDTO, UpdateRoleDTO } from '../dto';
import { Role } from '../entities';

@Injectable()
export class RolesRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  async findAll(filters: FindAllRolesFiltersDTO = {}): Promise<Role[]> {
    try {
      const roles = await this.prisma.platformRole.findMany({
        where: filters.includeDeleted ? undefined : { deletedAt: null },
        orderBy: [{ label: 'asc' }, { name: 'asc' }],
      });

      return roles;
    } catch (error) {
      this.handleError('RolesRepository.findAll falhou', error, { filters });
    }
  }

  async findById(id: string): Promise<Role | null> {
    try {
      const role = await this.prisma.platformRole.findUnique({
        where: { id },
      });

      return role;
    } catch (error) {
      this.handleError('RolesRepository.findById falhou', error, { id });
    }
  }

  async findByCode(roleCode: string): Promise<Role | null> {
    try {
      const role = await this.prisma.platformRole.findFirst({
        where: {
          name: roleCode,
          deletedAt: null,
        },
      });

      return role;
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

      const roles = await this.prisma.platformRole.findMany({
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

  async create(data: CreateRoleDTO): Promise<Role> {
    try {
      const role = await this.prisma.platformRole.create({
        data: {
          label: data.label,
          name: data.name,
          isBackoffice: data.isBackoffice,
          canHaveSubordinates: data.canHaveSubordinates,
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

  async update(id: string, data: UpdateRoleDTO): Promise<Role> {
    try {
      const role = await this.prisma.platformRole.update({
        where: { id },
        data: {
          ...(data.label !== undefined && { label: data.label }),
          ...(data.name !== undefined && { name: data.name }),
          ...(data.isBackoffice !== undefined && {
            isBackoffice: data.isBackoffice,
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
      await this.prisma.platformRole.update({
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
