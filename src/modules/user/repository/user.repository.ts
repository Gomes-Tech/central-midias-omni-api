import { BadRequestException } from '@common/filters';
import { generateId } from '@common/utils';
import { LoggerService } from '@infrastructure/log';
import { PrismaService } from '@infrastructure/prisma';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  CreateGlobalUserDTO,
  CreateUserDTO,
  FindAllUsersFilters,
  UpdateUserDTO,
} from '../dto';

@Injectable()
export class UserRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  async findAll(filters: FindAllUsersFilters = {}): Promise<{
    data: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const page = filters.page && filters.page > 0 ? filters.page : 1;
      const limit = filters.limit && filters.limit > 0 ? filters.limit : 10;
      const skip = (page - 1) * limit;
      const organizationId = filters.organizationId ?? filters.companyId;

      const where: Prisma.UserWhereInput = {
        isDeleted: false,
        ...(typeof filters.isActive === 'boolean' && {
          isActive: filters.isActive,
        }),
        ...(organizationId && {
          platformUserOrganizations: {
            some: {
              organizationId,
            },
          },
        }),
        ...(filters.managerId && {
          managerOf: {
            some: {
              managerId: filters.managerId,
            },
          },
        }),
        ...(filters.name && {
          name: {
            contains: filters.name,
            mode: 'insensitive',
          },
        }),
        ...(filters.email && {
          email: {
            contains: filters.email,
            mode: 'insensitive',
          },
        }),
        ...(filters.searchTerm && {
          OR: [
            {
              name: {
                contains: filters.searchTerm,
                mode: 'insensitive',
              },
            },
            {
              email: {
                contains: filters.searchTerm,
                mode: 'insensitive',
              },
            },
            ...(filters.searchTerm.replace(/\D/g, '').length > 0
              ? [
                  {
                    taxIdentifier: {
                      contains: filters.searchTerm.replace(/\D/g, ''),
                      mode: 'insensitive' as const,
                    },
                  },
                ]
              : []),
          ],
        }),
      };

      const [users, total] = await Promise.all([
        this.prisma.user.findMany({
          where,
          select: {
            id: true,
            name: true,
            email: true,
            avatarKey: true,
            isActive: true,
            globalRoleId: true,
          },
          skip,
          take: limit,
          orderBy: {
            name: 'asc',
          },
        }),
        this.prisma.user.count({ where }),
      ]);

      return {
        data: users,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      void this.logger.error('UserRepository.findAll falhou', {
        error: String(error),
        filters,
      });

      throw new BadRequestException('Erro ao buscar usu?rios');
    }
  }

  async findById(id: string, isBackoffice?: boolean): Promise<any | null> {
    const include = {
      ...(isBackoffice
        ? {
            globalRole: {
              select: {
                id: true,
                name: true,
              },
            },
          }
        : {
            members: {
              select: {
                organization: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                    avatarKey: true,
                  },
                },
                role: {
                  select: {
                    id: true,
                    name: true,
                    label: true,
                    isSystem: true,
                    canAccessBackoffice: true,
                    canHaveSubordinates: true,
                  },
                },
              },
            },
          }),
    };

    try {
      const user = await this.prisma.user.findUniqueOrThrow({
        where: {
          id,
          isDeleted: false,
        },
        include: include,
      });

      return user;
    } catch (error) {
      void this.logger.error('UserRepository.findById falhou', {
        error: String(error),
        id,
      });

      throw new BadRequestException('Erro ao buscar usu?rio por id');
    }
  }

  async findRoleByUserId(userId: string): Promise<{
    userId: string;
    memberships: Array<{
      organizationId: string;
      role: {
        id: string;
        name: string;
        label: string;
        isSystem: boolean;
        canAccessBackoffice: boolean;
        canHaveSubordinates: boolean;
      };
    }>;
  } | null> {
    try {
      const user = await this.prisma.user.findFirst({
        where: {
          id: userId,
          isDeleted: false,
        },
        select: {
          id: true,
          members: {
            select: {
              organizationId: true,
              role: {
                select: {
                  id: true,
                  name: true,
                  label: true,
                  isSystem: true,
                  canAccessBackoffice: true,
                  canHaveSubordinates: true,
                },
              },
            },
          },
        },
      });

      if (!user) {
        return null;
      }

      return {
        userId: user.id,
        memberships: user.members.map((m) => ({
          organizationId: m.organizationId,
          role: m.role,
        })),
      };
    } catch (error) {
      void this.logger.error('UserRepository.findRoleByUserId falhou', {
        error: String(error),
        userId,
      });

      throw new BadRequestException('Erro ao buscar perfil do usu?rio');
    }
  }

  async findByEmail(email: string): Promise<any> {
    try {
      const user = await this.prisma.user.findUniqueOrThrow({
        where: {
          email,
          isDeleted: false,
        },
      });

      if (!user) {
        return null;
      }

      return user;
    } catch (error) {
      void this.logger.error('UserRepository.findByEmail falhou', {
        error: String(error),
        email,
      });
    }
  }

  async findByTaxIdentifier(
    taxIdentifier: string,
  ): Promise<{ id: string; taxIdentifier: string } | null> {
    try {
      return await this.prisma.user.findFirst({
        where: {
          taxIdentifier,
          isDeleted: false,
        },
        select: { id: true, taxIdentifier: true },
      });
    } catch (error) {
      void this.logger.error('UserRepository.findByTaxIdentifier falhou', {
        error: String(error),
        taxIdentifier,
      });

      throw new BadRequestException('Erro ao buscar usu?rio por documento');
    }
  }

  async create(
    data: CreateUserDTO & { password: string },
    userId: string,
    organizationId: string,
  ): Promise<{ id: string }> {
    try {
      const user = await this.prisma.$transaction(async (tx) => {
        const user = await this.prisma.user.create({
          data: {
            id: generateId(),
            name: data.name,
            email: data.email,
            password: data.password,
            taxIdentifier: data.taxIdentifier,
            phone: data.phone,
            socialReason: data.socialReason,
            birthDate: data.birthDate,
            admissionDate: data.admissionDate,
          },
          select: {
            id: true,
          },
        });

        await tx.member.create({
          data: {
            id: generateId(),
            organizationId,
            userId: user.id,
            roleId: data.roleId,
          },
          select: {
            id: true,
          },
        });

        return user;
      });

      void this.logger.info('Usu?rio criado', {
        userId: user.id,
        createdBy: userId,
      });

      return { id: user.id };
    } catch (error) {
      void this.logger.error('UserRepository.create falhou', {
        error: String(error),
        email: data.email,
      });

      throw new BadRequestException('Erro ao criar usu?rio');
    }
  }

  async createGlobalUser(
    data: CreateGlobalUserDTO & { password: string },
    userId: string,
  ): Promise<{ id: string }> {
    try {
      const user = await this.prisma.$transaction(async (tx) => {
        const user = await this.prisma.user.create({
          data: {
            id: generateId(),
            name: data.name,
            email: data.email,
            password: data.password,
            taxIdentifier: data.taxIdentifier,
            globalRoleId: data.globalRoleId,
          },
          select: {
            id: true,
          },
        });

        for (const organizationId of data.organizationIds) {
          await tx.member.create({
            data: {
              id: generateId(),
              organizationId,
              userId: user.id,
              roleId: data.globalRoleId,
            },
            select: {
              id: true,
            },
          });
        }

        return user;
      });

      void this.logger.info('Usu?rio criado', {
        userId: user.id,
        createdBy: userId,
      });

      return { id: user.id };
    } catch (error) {
      void this.logger.error('UserRepository.create falhou', {
        error: String(error),
        email: data.email,
      });

      throw new BadRequestException('Erro ao criar usu?rio');
    }
  }

  async update(id: string, data: UpdateUserDTO, userId: string): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { id },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.email !== undefined && { email: data.email }),
          ...(data.password !== undefined && { password: data.password }),
          ...(data.taxIdentifier !== undefined && {
            taxIdentifier: data.taxIdentifier,
          }),
          ...(data.phone !== undefined && { phone: data.phone }),
          ...(data.socialReason !== undefined && {
            socialReason: data.socialReason,
          }),
          ...(data.isActive !== undefined && { isActive: data.isActive }),
          ...(data.isFirstAccess !== undefined && {
            isFirstAccess: data.isFirstAccess,
          }),
        },
      });

      void this.logger.info('Usu?rio atualizado', {
        userId: id,
        updatedBy: userId,
      });
    } catch (error) {
      void this.logger.error('UserRepository.update falhou', {
        error: String(error),
        userId: id,
      });

      throw new BadRequestException('Erro ao atualizar usu?rio');
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { id },
        data: {
          isActive: false,
          isDeleted: true,
          deletedAt: new Date(),
        },
      });

      void this.logger.info('Usu?rio exclu?do (soft delete)', { userId: id });
    } catch (error) {
      void this.logger.error('UserRepository.delete falhou', {
        error: String(error),
        userId: id,
      });

      throw new BadRequestException('Erro ao deletar usu?rio');
    }
  }
}
