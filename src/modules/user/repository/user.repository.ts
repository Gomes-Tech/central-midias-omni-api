import { BadRequestException, NotFoundException } from '@common/filters';
import { LoggerService } from '@infrastructure/log';
import { PrismaService } from '@infrastructure/prisma';
import {
  HttpException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  CreateUserDTO,
  FindAllUsersFilters,
  UpdateUserDTO,
  UserManagerAssignmentDTO,
} from '../dto';
import { ListUser, PlatformRoleSummary, User } from '../entities';

const platformRoleSelect = {
  id: true,
  name: true,
  label: true,
  isSystem: true,
  isBackoffice: true,
  canHaveSubordinates: true,
} satisfies Prisma.PlatformRoleSelect;

const relationUserSelect = {
  id: true,
  name: true,
  email: true,
  isActive: true,
  isDeleted: true,
  platformRole: {
    select: platformRoleSelect,
  },
} satisfies Prisma.UserSelect;

const userInclude = {
  platformRole: {
    select: platformRoleSelect,
  },
  platformUserOrganizations: {
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true,
          isActive: true,
        },
      },
    },
    orderBy: {
      organization: {
        name: 'asc',
      },
    },
  },
  managedUsers: {
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      subordinate: {
        select: relationUserSelect,
      },
    },
    orderBy: [
      {
        organization: {
          name: 'asc',
        },
      },
      {
        subordinate: {
          name: 'asc',
        },
      },
    ],
  },
  managerOf: {
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      manager: {
        select: relationUserSelect,
      },
    },
    orderBy: [
      {
        organization: {
          name: 'asc',
        },
      },
      {
        manager: {
          name: 'asc',
        },
      },
    ],
  },
} satisfies Prisma.UserInclude;

type UserWithRelations = Prisma.UserGetPayload<{
  include: typeof userInclude;
}>;

type TransactionClient = Prisma.TransactionClient;

@Injectable()
export class UserRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  async findAll(
    filters: FindAllUsersFilters = {},
  ): Promise<{
    data: ListUser[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const page = filters.page && filters.page > 0 ? filters.page : 1;
      const limit = filters.limit && filters.limit > 0 ? filters.limit : 10;
      const skip = (page - 1) * limit;
      const organizationId = filters.organizationId ?? filters.companyId;
      const roleFilter =
        filters.platformRoleId ?? filters.platformRoleName ?? filters.role;

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
            {
              platformRole: {
                label: {
                  contains: filters.searchTerm,
                  mode: 'insensitive',
                },
              },
            },
            {
              platformRole: {
                name: {
                  contains: filters.searchTerm,
                  mode: 'insensitive',
                },
              },
            },
          ],
        }),
        ...(roleFilter && {
          OR: [
            {
              platformRoleId: roleFilter,
            },
            {
              platformRole: {
                name: roleFilter,
              },
            },
            {
              platformRole: {
                label: {
                  contains: roleFilter,
                  mode: 'insensitive',
                },
              },
            },
          ],
        }),
      };

      const [users, total] = await Promise.all([
        this.prisma.user.findMany({
          where,
          include: userInclude,
          skip,
          take: limit,
          orderBy: {
            name: 'asc',
          },
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
      this.handleError('UserRepository.findAll falhou', error, {
        filters,
      });
    }
  }

  async findById(id: string): Promise<User | null> {
    try {
      const user = await this.prisma.user.findFirst({
        where: {
          id,
          isDeleted: false,
        },
        include: userInclude,
      });

      return user ? this.toUser(user) : null;
    } catch (error) {
      this.handleError('UserRepository.findById falhou', error, { id });
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      const user = await this.prisma.user.findFirst({
        where: {
          email,
          isDeleted: false,
        },
        include: userInclude,
      });

      return user ? this.toUser(user) : null;
    } catch (error) {
      this.handleError('UserRepository.findByEmail falhou', error, { email });
    }
  }

  async findRoleByUserId(userId: string): Promise<string | null> {
    try {
      const user = await this.prisma.user.findFirst({
        where: {
          id: userId,
          isDeleted: false,
        },
        select: {
          platformRole: {
            select: {
              name: true,
            },
          },
        },
      });

      return user?.platformRole.name ?? null;
    } catch (error) {
      this.handleError('UserRepository.findRoleByUserId falhou', error, {
        userId,
      });
    }
  }

  async create(data: CreateUserDTO & { password: string }): Promise<User> {
    try {
      const user = await this.prisma.$transaction(async (tx) => {
        await this.resolvePlatformRole(tx, data.platformRoleId);
        const organizationIds = await this.resolveOrganizations(
          tx,
          data.organizationIds,
        );

        const createdUser = await tx.user.create({
          data: {
            name: data.name,
            email: data.email,
            password: data.password,
            isActive: data.isActive ?? true,
            platformRoleId: data.platformRoleId,
          },
        });

        await this.replaceOrganizationLinks(tx, createdUser.id, organizationIds);

        const managerAssignments = await this.validateManagerAssignments(
          tx,
          createdUser.id,
          data.managerAssignments,
          organizationIds,
        );

        await this.replaceManagerAssignments(
          tx,
          createdUser.id,
          managerAssignments,
        );

        return tx.user.findUniqueOrThrow({
          where: { id: createdUser.id },
          include: userInclude,
        });
      });

      void this.logger.info('Usuário criado', {
        userId: user.id,
        email: user.email,
        platformRoleId: user.platformRoleId,
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
        const existingUser = await tx.user.findFirst({
          where: {
            id,
            isDeleted: false,
          },
          include: userInclude,
        });

        if (!existingUser) {
          throw new NotFoundException('Usuário não encontrado');
        }

        const targetPlatformRole = data.platformRoleId
          ? await this.resolvePlatformRole(tx, data.platformRoleId)
          : existingUser.platformRole;

        const targetOrganizationIds =
          data.organizationIds !== undefined
            ? await this.resolveOrganizations(tx, data.organizationIds)
            : existingUser.platformUserOrganizations.map(
                ({ organizationId }) => organizationId,
              );

        await tx.user.update({
          where: { id },
          data: {
            ...(data.name !== undefined && { name: data.name }),
            ...(data.email !== undefined && { email: data.email }),
            ...(data.password !== undefined && { password: data.password }),
            ...(typeof data.isActive === 'boolean' && {
              isActive: data.isActive,
            }),
            ...(data.platformRoleId !== undefined && {
              platformRoleId: data.platformRoleId,
            }),
          },
        });

        if (data.organizationIds !== undefined) {
          await this.replaceOrganizationLinks(tx, id, targetOrganizationIds);
          await this.pruneHierarchyByOrganizations(tx, id, targetOrganizationIds);
        }

        if (data.managerAssignments !== undefined) {
          const managerAssignments = await this.validateManagerAssignments(
            tx,
            id,
            data.managerAssignments,
            targetOrganizationIds,
          );

          await this.replaceManagerAssignments(tx, id, managerAssignments);
        } else if (data.organizationIds !== undefined) {
          await this.pruneSubordinateManagers(tx, id, targetOrganizationIds);
        }

        if (!targetPlatformRole.canHaveSubordinates) {
          await tx.userHierarchy.deleteMany({
            where: {
              managerId: id,
            },
          });
        }

        return tx.user.findUniqueOrThrow({
          where: { id },
          include: userInclude,
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

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.userHierarchy.deleteMany({
          where: {
            OR: [{ managerId: id }, { subordinateId: id }],
          },
        });

        await tx.platformUserOrganization.deleteMany({
          where: { userId: id },
        });

        await tx.user.update({
          where: { id },
          data: {
            isActive: false,
            isDeleted: true,
            deletedAt: new Date(),
          },
        });
      });

      void this.logger.info('Usuário excluído (soft delete)', { userId: id });
    } catch (error) {
      this.handleError('UserRepository.delete falhou', error, {
        userId: id,
      });
    }
  }

  private async resolvePlatformRole(
    tx: TransactionClient,
    platformRoleId: string,
  ) {
    const platformRole = await tx.platformRole.findFirst({
      where: {
        id: platformRoleId,
        deletedAt: null,
      },
      select: platformRoleSelect,
    });

    if (!platformRole) {
      throw new BadRequestException('Perfil de plataforma inválido');
    }

    return platformRole;
  }

  private async resolveOrganizations(
    tx: TransactionClient,
    organizationIds: string[] = [],
  ): Promise<string[]> {
    const normalizedOrganizationIds = [...new Set(organizationIds)];

    if (!normalizedOrganizationIds.length) {
      return [];
    }

    const organizations = await tx.organization.findMany({
      where: {
        id: {
          in: normalizedOrganizationIds,
        },
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    if (organizations.length !== normalizedOrganizationIds.length) {
      throw new BadRequestException(
        'Uma ou mais organizações informadas não existem ou estão inativas',
      );
    }

    return organizations.map(({ id }) => id);
  }

  private async validateManagerAssignments(
    tx: TransactionClient,
    subordinateId: string,
    assignments: UserManagerAssignmentDTO[] = [],
    organizationIds: string[],
  ): Promise<UserManagerAssignmentDTO[]> {
    const normalizedAssignments = this.normalizeManagerAssignments(assignments);

    if (!normalizedAssignments.length) {
      return [];
    }

    if (!organizationIds.length) {
      throw new BadRequestException(
        'Vínculos de gestor exigem que o usuário esteja associado a pelo menos uma organização',
      );
    }

    const organizationIdSet = new Set(organizationIds);

    for (const assignment of normalizedAssignments) {
      if (assignment.managerId === subordinateId) {
        throw new BadRequestException(
          'Um usuário não pode ser gestor de si mesmo',
        );
      }

      if (!organizationIdSet.has(assignment.organizationId)) {
        throw new BadRequestException(
          'O gestor só pode ser definido para uma organização já vinculada ao usuário',
        );
      }
    }

    const managerIds = [
      ...new Set(normalizedAssignments.map(({ managerId }) => managerId)),
    ];

    const managers = await tx.user.findMany({
      where: {
        id: {
          in: managerIds,
        },
        isDeleted: false,
        isActive: true,
      },
      select: {
        id: true,
        platformRole: {
          select: {
            canHaveSubordinates: true,
          },
        },
        platformUserOrganizations: {
          select: {
            organizationId: true,
          },
        },
      },
    });

    if (managers.length !== managerIds.length) {
      throw new BadRequestException(
        'Um ou mais gestores informados não existem ou estão inativos',
      );
    }

    const managerMap = new Map(managers.map((manager) => [manager.id, manager]));

    for (const assignment of normalizedAssignments) {
      const manager = managerMap.get(assignment.managerId);

      if (!manager) {
        throw new BadRequestException(
          'Um ou mais gestores informados não existem ou estão inativos',
        );
      }

      if (!manager.platformRole.canHaveSubordinates) {
        throw new BadRequestException(
          'O gestor informado não pode possuir subordinados',
        );
      }

      const managerHasOrganization = manager.platformUserOrganizations.some(
        ({ organizationId }) => organizationId === assignment.organizationId,
      );

      if (!managerHasOrganization) {
        throw new BadRequestException(
          'O gestor informado não está vinculado à organização selecionada',
        );
      }
    }

    return normalizedAssignments;
  }

  private normalizeManagerAssignments(
    assignments: UserManagerAssignmentDTO[] = [],
  ): UserManagerAssignmentDTO[] {
    const assignmentMap = new Map<string, UserManagerAssignmentDTO>();

    for (const assignment of assignments) {
      if (assignmentMap.has(assignment.organizationId)) {
        throw new BadRequestException(
          'O usuário só pode possuir um gestor por organização',
        );
      }

      assignmentMap.set(assignment.organizationId, assignment);
    }

    return [...assignmentMap.values()];
  }

  private async replaceOrganizationLinks(
    tx: TransactionClient,
    userId: string,
    organizationIds: string[],
  ): Promise<void> {
    await tx.platformUserOrganization.deleteMany({
      where: { userId },
    });

    if (!organizationIds.length) {
      return;
    }

    await tx.platformUserOrganization.createMany({
      data: organizationIds.map((organizationId) => ({
        userId,
        organizationId,
      })),
    });
  }

  private async replaceManagerAssignments(
    tx: TransactionClient,
    subordinateId: string,
    assignments: UserManagerAssignmentDTO[],
  ): Promise<void> {
    await tx.userHierarchy.deleteMany({
      where: { subordinateId },
    });

    if (!assignments.length) {
      return;
    }

    await tx.userHierarchy.createMany({
      data: assignments.map(({ managerId, organizationId }) => ({
        managerId,
        subordinateId,
        organizationId,
      })),
    });
  }

  private async pruneHierarchyByOrganizations(
    tx: TransactionClient,
    userId: string,
    organizationIds: string[],
  ): Promise<void> {
    if (!organizationIds.length) {
      await tx.userHierarchy.deleteMany({
        where: {
          OR: [{ subordinateId: userId }, { managerId: userId }],
        },
      });
      return;
    }

    await tx.userHierarchy.deleteMany({
      where: {
        organizationId: {
          notIn: organizationIds,
        },
        OR: [{ subordinateId: userId }, { managerId: userId }],
      },
    });
  }

  private async pruneSubordinateManagers(
    tx: TransactionClient,
    subordinateId: string,
    organizationIds: string[],
  ): Promise<void> {
    if (!organizationIds.length) {
      await tx.userHierarchy.deleteMany({
        where: { subordinateId },
      });
      return;
    }

    await tx.userHierarchy.deleteMany({
      where: {
        subordinateId,
        organizationId: {
          notIn: organizationIds,
        },
      },
    });
  }

  private toPlatformRoleSummary(
    platformRole: UserWithRelations['platformRole'],
  ): PlatformRoleSummary {
    return {
      id: platformRole.id,
      name: platformRole.name,
      label: platformRole.label,
      isSystem: platformRole.isSystem,
      isBackoffice: platformRole.isBackoffice,
      canHaveSubordinates: platformRole.canHaveSubordinates,
    };
  }

  private toUser(user: UserWithRelations): User {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      password: user.password,
      isActive: user.isActive,
      isDeleted: user.isDeleted,
      platformRoleId: user.platformRoleId,
      platformRole: this.toPlatformRoleSummary(user.platformRole),
      organizations: user.platformUserOrganizations.map((access) => ({
        id: access.id,
        organizationId: access.organizationId,
        organizationName: access.organization.name,
        organizationSlug: access.organization.slug,
        organizationLogoUrl: access.organization.logoUrl,
        organizationIsActive: access.organization.isActive,
      })),
      managers: user.managerOf
        .filter(({ manager }) => !manager.isDeleted)
        .map((managerLink) => ({
          id: managerLink.id,
          organizationId: managerLink.organizationId,
          organizationName: managerLink.organization.name,
          organizationSlug: managerLink.organization.slug,
          managerId: managerLink.manager.id,
          managerName: managerLink.manager.name,
          managerEmail: managerLink.manager.email,
          createdAt: managerLink.createdAt,
        })),
      subordinates: user.managedUsers
        .filter(({ subordinate }) => !subordinate.isDeleted)
        .map((subordinateLink) => ({
          id: subordinateLink.id,
          organizationId: subordinateLink.organizationId,
          organizationName: subordinateLink.organization.name,
          organizationSlug: subordinateLink.organization.slug,
          subordinateId: subordinateLink.subordinate.id,
          subordinateName: subordinateLink.subordinate.name,
          subordinateEmail: subordinateLink.subordinate.email,
          createdAt: subordinateLink.createdAt,
        })),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      deletedAt: user.deletedAt,
    };
  }

  private toListUser(user: UserWithRelations): ListUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      isActive: user.isActive,
      isDeleted: user.isDeleted,
      platformRoleId: user.platformRoleId,
      platformRole: this.toPlatformRoleSummary(user.platformRole),
      organizations: user.platformUserOrganizations.map((access) => ({
        id: access.id,
        organizationId: access.organizationId,
        organizationName: access.organization.name,
        organizationSlug: access.organization.slug,
        organizationLogoUrl: access.organization.logoUrl,
        organizationIsActive: access.organization.isActive,
      })),
      managerCount: user.managerOf.filter(({ manager }) => !manager.isDeleted)
        .length,
      subordinateCount: user.managedUsers.filter(
        ({ subordinate }) => !subordinate.isDeleted,
      ).length,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      deletedAt: user.deletedAt,
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
