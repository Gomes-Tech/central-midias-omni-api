import { LoggerService } from '@infrastructure/log';
import { PrismaService } from '@infrastructure/prisma';
import {
  HttpException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { getHighestUserRole, UserRole } from 'types/role';
import { CreateUserDTO, FindAllUsersFilters, UpdateUserDTO } from '../dto';
import { ListUser, User } from '../entities';

type UserWithRelations = Prisma.UserGetPayload<{
  include: {
    userRoles: {
      include: {
        role: true;
      };
    };
    userCompanyAccesses: {
      include: {
        company: true;
      };
    };
    userManager: true;
  };
}>;

@Injectable()
export class UserRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  async findAll(filters: FindAllUsersFilters = {}): Promise<{
    data: ListUser[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const { page = 1, limit = 10, name, email, role, companyId } = filters;
      const skip = (page - 1) * limit;

      const where: Prisma.UserWhereInput = {
        isDeleted: false,
        ...(typeof filters.isActive === 'boolean' && {
          isActive: filters.isActive,
        }),
        ...(typeof filters.isEmployee === 'boolean' && {
          isEmployee: filters.isEmployee,
        }),
        ...(name && { name: { contains: name, mode: 'insensitive' } }),
        ...(email && {
          email: { contains: email, mode: 'insensitive' },
        }),
        ...(role && {
          userRoles: {
            some: {
              role: {
                role,
                deletedAt: null,
              },
            },
          },
        }),
        ...(companyId && {
          userCompanyAccesses: {
            some: {
              companyId,
            },
          },
        }),
      };

      const [users, total] = await Promise.all([
        this.prisma.user.findMany({
          where,
          include: this.userInclude,
          skip,
          take: limit,
          orderBy: { name: 'asc' },
        }),
        this.prisma.user.count({ where }),
      ]);

      return {
        data: users.map((user) => this.toListUser(user)),
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.handleError('UserRepository.findAll falhou', error, { filters });
    }
  }

  async findTechnicians(): Promise<{ id: string; name: string }[]> {
    try {
      const users = await this.prisma.user.findMany({
        where: {
          isDeleted: false,
          isActive: true,
          isEmployee: true,
        },
        select: {
          id: true,
          name: true,
        },
        orderBy: {
          name: 'asc',
        },
      });

      return users;
    } catch (error) {
      this.handleError('UserRepository.findTechnicians falhou', error);
    }
  }

  async findById(id: string): Promise<User | null> {
    try {
      const user = await this.prisma.user.findFirst({
        where: { id, isDeleted: false },
        include: this.userInclude,
      });

      if (!user) {
        return null;
      }

      return this.toUser(user);
    } catch (error) {
      this.handleError('UserRepository.findById falhou', error, { id });
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      const user = await this.prisma.user.findFirst({
        where: { email, isDeleted: false },
        include: this.userInclude,
      });

      if (!user) {
        return null;
      }

      return this.toUser(user);
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

  async findRoleByUserId(userId: string): Promise<UserRole | null> {
    try {
      const user = await this.prisma.user.findFirst({
        where: { id: userId, isDeleted: false, isActive: true },
        include: {
          userRoles: {
            where: {
              role: {
                deletedAt: null,
              },
            },
            include: {
              role: true,
            },
          },
        },
      });

      if (!user) {
        return null;
      }

      return (
        getHighestUserRole(user.userRoles.map(({ role }) => role.role)) ?? null
      );
    } catch (error) {
      this.handleError('UserRepository.findRoleByUserId falhou', error, {
        userId,
      });
    }
  }

  async create(data: CreateUserDTO & { password: string }): Promise<User> {
    try {
      const user = await this.prisma.$transaction(async (tx) => {
        const resolvedRoles = await this.resolveRoles(tx, data.roles);
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

        if (resolvedRoles.length) {
          await tx.userRole.createMany({
            data: resolvedRoles.map((role) => ({
              userId: createdUser.id,
              roleId: role.id,
            })),
          });
        }

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

        if (data.roles) {
          const resolvedRoles = await this.resolveRoles(tx, data.roles);

          await tx.userRole.deleteMany({ where: { userId: id } });

          if (resolvedRoles.length) {
            await tx.userRole.createMany({
              data: resolvedRoles.map((role) => ({
                userId: id,
                roleId: role.id,
              })),
            });
          }
        }

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

  private readonly userInclude = {
    userRoles: {
      where: {
        role: {
          deletedAt: null,
        },
      },
      include: {
        role: true,
      },
    },
    userCompanyAccesses: {
      include: {
        company: true,
      },
    },
    userManager: true,
  } satisfies Prisma.UserInclude;

  private toUser(user: UserWithRelations): User {
    const roles = user.userRoles.map(({ role }) => ({
      id: role.id,
      label: role.label,
      role: role.role as UserRole,
    }));

    return {
      id: user.id,
      name: user.name,
      socialReason: user.socialReason,
      taxIdentifier: user.taxIdentifier,
      phone: user.phone,
      birthDate: user.birthDate,
      email: user.email,
      password: user.password,
      isEmployee: user.isEmployee,
      isActive: user.isActive,
      isDeleted: user.isDeleted,
      isManager: Boolean(user.userManager),
      roles,
      primaryRole: getHighestUserRole(roles.map(({ role }) => role)),
      companyAccesses: user.userCompanyAccesses.map(
        ({ id, companyId, company }) => ({
          id,
          companyId,
          companyName: company.name,
          companySlug: company.slug,
          companyLogoUrl: company.logoUrl,
        }),
      ),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      deletedAt: user.deletedAt,
    };
  }

  private toListUser(user: UserWithRelations): ListUser {
    const mappedUser = this.toUser(user);

    return {
      id: mappedUser.id,
      name: mappedUser.name,
      socialReason: mappedUser.socialReason,
      taxIdentifier: mappedUser.taxIdentifier,
      email: mappedUser.email,
      phone: mappedUser.phone,
      isEmployee: mappedUser.isEmployee,
      isActive: mappedUser.isActive,
      isManager: mappedUser.isManager,
      roles: mappedUser.roles,
      primaryRole: mappedUser.primaryRole,
      companyAccesses: mappedUser.companyAccesses,
      createdAt: mappedUser.createdAt,
    };
  }

  private async resolveRoles(
    tx: Prisma.TransactionClient,
    userRoles: UserRole[],
  ) {
    const roles = await tx.roles.findMany({
      where: {
        role: {
          in: userRoles,
        },
        deletedAt: null,
      },
    });

    if (roles.length !== new Set(userRoles).size) {
      throw new HttpException(
        'Uma ou mais funções informadas não existem',
        400,
      );
    }

    return roles;
  }

  private async resolveCompanies(
    tx: Prisma.TransactionClient,
    companyIds: string[],
  ) {
    if (!companyIds.length) {
      return [];
    }

    const companies = await tx.company.findMany({
      where: {
        id: {
          in: companyIds,
        },
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    if (companies.length !== new Set(companyIds).size) {
      throw new HttpException(
        'Uma ou mais empresas informadas não existem',
        400,
      );
    }

    return companies.map((company) => company.id);
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
