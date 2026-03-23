import { NotFoundException } from '@common/filters';
import { LoggerService } from '@infrastructure/log';
import { PrismaService } from '@infrastructure/prisma';
import {
  HttpException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CreateUserDTO, FindAllUsersFilters, UpdateUserDTO } from '../dto';
import { User } from '../entities';

@Injectable()
export class UserRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  async findAllPlatformUsers(
    filters: FindAllUsersFilters = {},
    isAdmin: boolean = false,
  ): Promise<{
    data: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const { page = 1, limit = 10, searchTerm, role, companyId } = filters;
      const skip = (page - 1) * limit;

      const where: Prisma.UserWhereInput = {
        isDeleted: false,
        ...(typeof filters.isActive === 'boolean' && {
          isActive: filters.isActive,
        }),
        ...(companyId && {
          tenantMemberships: {
            some: {
              companyId,
            },
          },
        }),
        ...(searchTerm && {
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { email: { contains: searchTerm, mode: 'insensitive' } },
          ],
        }),
        ...(role && {
          userRoles: {
            some: {
              role: {
                role,
              },
            },
          },
        }),
      };

      const [users, total] = await Promise.all([
        this.prisma.user.findMany({
          where,
          select: {
            id: true,
            name: true,
            taxIdentifier: true,
            platformUserRoles: {
              select: {
                platformRole: {
                  select: {
                    label: true,
                  },
                },
              },
            },
          },
          skip,
          take: limit,
          orderBy: { name: 'asc' },
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
      void this.logger.error(String(error), {
        filters: JSON.stringify(filters) ?? undefined,
        path: 'UserRepository.findAllPlatformUsers',
        method: 'GET',
        userId: 'unknown',
        requestId: 'unknown',
      });
      this.handleError('UserRepository.findAllPlatformUsers falhou', error, {
        filters,
      });
    }
  }

  async findAllTenantUsers(
    filters: FindAllUsersFilters = {},
    companyId: string,
  ): Promise<{
    data: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const { page = 1, limit = 10, searchTerm, role } = filters;
      const skip = (page - 1) * limit;

      const where: Prisma.UserWhereInput = {
        isDeleted: false,
        ...(typeof filters.isActive === 'boolean' && {
          isActive: filters.isActive,
        }),
        ...(companyId && {
          tenantMemberships: {
            some: {
              companyId,
            },
          },
        }),
        ...(searchTerm && {
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { email: { contains: searchTerm, mode: 'insensitive' } },
          ],
        }),
        ...(role && {
          tenantMemberships: {
            some: {
              tenantRole: {
                id: role,
              },
            },
          },
        }),
      };

      const [users, total] = await Promise.all([
        this.prisma.user.findMany({
          where,
          select: {
            id: true,
            name: true,
            taxIdentifier: true,
            tenantMemberships: {
              select: {
                tenantRole: {
                  select: {
                    label: true,
                  },
                },
              },
            },
          },
          skip,
          take: limit,
          orderBy: { name: 'asc' },
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
      void this.logger.error(String(error), {
        filters: JSON.stringify(filters) ?? undefined,
        path: 'UserRepository.findAllTenantUsers',
        method: 'GET',
        userId: 'unknown',
        requestId: 'unknown',
      });
      this.handleError('UserRepository.findAllTenantUsers falhou', error, {
        filters,
      });
    }
  }

  async findById(id: string, companyId: string): Promise<any> {
    try {
      const user = await this.prisma.user.findUniqueOrThrow({
        where: {
          id,
          isDeleted: false,
          tenantMemberships: {
            some: {
              companyId: companyId,
            },
          },
        },
        select: {
          id: true,
          name: true,
          taxIdentifier: true,
          socialReason: true,
          phone: true,
          birthDate: true,
          email: true,
          isActive: true,
          tenantMemberships: {
            select: {
              tenantRole: {
                select: {
                  id: true,
                },
              },
            },
          },
        },
      });

      const { tenantMemberships, ...rest } = user;

      return {
        ...rest,
        role: tenantMemberships[0].tenantRole.id,
      };
    } catch (error) {
      if (error.code === 'P2025') {
        this.logger.error(String(error), {
          method: 'UserRepository.findById',
          path: 'UserRepository.findById',
          userId: 'unknown',
          requestId: 'unknown',
          companyId,
          id,
        });
        throw new NotFoundException('Usuário não encontrado');
      }
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      const user = await this.prisma.user.findFirst({
        where: { email, isDeleted: false },
      });

      if (!user) {
        return null;
      }
    } catch (error) {
      this.handleError('UserRepository.findByEmail falhou', error, { email });
    }
  }

  async findByTaxIdentifier(taxIdentifier: string): Promise<User | null> {
    try {
      const user = await this.prisma.user.findFirst({
        where: { taxIdentifier, isDeleted: false },
        include: this.userInclude,
      });

      if (!user) {
        return null;
      }

      return this.toUser(user);
    } catch (error) {
      this.handleError('UserRepository.findByTaxIdentifier falhou', error, {
        taxIdentifier,
      });
    }
  }

  async create(data: CreateUserDTO & { password: string }): Promise<User> {
    try {
      const user = await this.prisma.$transaction(async (tx) => {
        const resolvedCompanyIds = await this.resolveCompanies(
          tx,
          data.companyIds ?? [],
        );

        const createdUser = await tx.user.create({
          data: {
            name: data.name,
            socialReason: data.socialReason,
            taxIdentifier: data.taxIdentifier,
            phone: data.phone,
            birthDate: new Date(data.birthDate),
            email: data.email,
            password: data.password,
            isEmployee: data.isEmployee ?? false,
            isActive: data.isActive ?? true,
          },
        });

        if (resolvedCompanyIds.length) {
          await tx.userCompanyAccess.createMany({
            data: resolvedCompanyIds.map((companyId) => ({
              userId: createdUser.id,
              companyId,
            })),
          });
        }

        if (data.isManager) {
          await tx.userManager.create({
            data: {
              userId: createdUser.id,
            },
          });
        }

        return tx.user.findUniqueOrThrow({
          where: { id: createdUser.id },
          include: this.userInclude,
        });
      });

      void this.logger.info('Usuário criado', {
        userId: user.id,
        email: user.email,
      });

      return this.toUser(user);
    } catch (error) {
      this.handleError('UserRepository.create falhou', error, {
        email: data.email,
      });
    }
  }

  async update(id: string, data: UpdateUserDTO): Promise<User> {
    try {
      const user = await this.prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id },
          data: {
            ...(data.name !== undefined && { name: data.name }),
            ...(data.socialReason !== undefined && {
              socialReason: data.socialReason,
            }),
            ...(data.email !== undefined && { email: data.email }),
            ...(data.taxIdentifier !== undefined && {
              taxIdentifier: data.taxIdentifier,
            }),
            ...(data.phone !== undefined && { phone: data.phone }),
            ...(data.birthDate !== undefined && {
              birthDate: new Date(data.birthDate),
            }),
            ...(data.password !== undefined && { password: data.password }),
            ...(typeof data.isEmployee === 'boolean' && {
              isEmployee: data.isEmployee,
            }),
            ...(typeof data.isActive === 'boolean' && {
              isActive: data.isActive,
            }),
          },
        });

        if (data.companyIds) {
          const resolvedCompanyIds = await this.resolveCompanies(
            tx,
            data.companyIds,
          );

          await tx.userCompanyAccess.deleteMany({ where: { userId: id } });

          if (resolvedCompanyIds.length) {
            await tx.userCompanyAccess.createMany({
              data: resolvedCompanyIds.map((companyId) => ({
                userId: id,
                companyId,
              })),
            });
          }
        }

        if (typeof data.isManager === 'boolean') {
          const currentManagerLink = await tx.userManager.findUnique({
            where: { userId: id },
          });

          if (data.isManager && !currentManagerLink) {
            await tx.userManager.create({
              data: { userId: id },
            });
          }

          if (!data.isManager && currentManagerLink) {
            await tx.userManager.delete({
              where: { userId: id },
            });
          }
        }

        return tx.user.findUniqueOrThrow({
          where: { id },
          include: this.userInclude,
        });
      });

      void this.logger.info('Usuário atualizado', { userId: id });

      return this.toUser(user);
    } catch (error) {
      this.handleError('UserRepository.update falhou', error, {
        userId: id,
      });
    }
  }

  async delete(id: string) {
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
      this.handleError('UserRepository.delete falhou', error, {
        userId: id,
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
