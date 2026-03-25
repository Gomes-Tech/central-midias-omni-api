import { BadRequestException } from '@common/filters';
import { generateId } from '@common/utils';
import { LoggerService } from '@infrastructure/log';
import { PrismaService } from '@infrastructure/prisma';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CreateUserDTO, FindAllUsersFilters, UpdateUserDTO } from '../dto';

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
          ],
        }),
      };

      const [users, total] = await Promise.all([
        this.prisma.user.findMany({
          where,
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

      throw new BadRequestException('Erro ao buscar usuários');
    }
  }

  async findById(id: string): Promise<any | null> {
    try {
      const user = await this.prisma.user.findUniqueOrThrow({
        where: {
          id,
          isDeleted: false,
        },
        include: {
          members: {
            select: {
              organization: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  avatarUrl: true,
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
        },
      });

      return user;
    } catch (error) {
      void this.logger.error('UserRepository.findById falhou', {
        error: String(error),
        id,
      });

      throw new BadRequestException('Erro ao buscar usuário por id');
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

      throw new BadRequestException('Erro ao buscar usuário por email');
    }
  }

  async create(
    data: CreateUserDTO & { password: string },
  ): Promise<{ id: string }> {
    try {
      const user = await this.prisma.user.create({
        data: {
          id: generateId(),
          name: data.name,
          email: data.email,
          password: data.password,
        },
      });

      void this.logger.info('Usuário criado', {
        userId: user.id,
      });

      return { id: user.id };
    } catch (error) {
      void this.logger.error('UserRepository.create falhou', {
        error: String(error),
        email: data.email,
      });

      throw new BadRequestException('Erro ao criar usuário');
    }
  }

  async update(id: string, data: UpdateUserDTO): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { id },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.email !== undefined && { email: data.email }),
          ...(data.password !== undefined && { password: data.password }),
          ...(data.isActive !== undefined && { isActive: data.isActive }),
          ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
        },
      });

      void this.logger.info('Usuário atualizado', { userId: id });
    } catch (error) {
      void this.logger.error('UserRepository.update falhou', {
        error: String(error),
        userId: id,
      });

      throw new BadRequestException('Erro ao atualizar usuário');
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

      void this.logger.info('Usuário excluído (soft delete)', { userId: id });
    } catch (error) {
      void this.logger.error('UserRepository.delete falhou', {
        error: String(error),
        userId: id,
      });

      throw new BadRequestException('Erro ao deletar usuário');
    }
  }
}
