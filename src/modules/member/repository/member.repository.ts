import { BadRequestException } from '@common/filters';
import { generateId } from '@common/utils';
import { LoggerService } from '@infrastructure/log';
import { PrismaService } from '@infrastructure/prisma';
import { Injectable } from '@nestjs/common';
import { Action, Prisma } from '@prisma/client';
import { PaginatedResponse } from '../../../types';
import {
  CreateMemberDTO,
  FindAllMembersFiltersDTO,
  UpdateMemberDTO,
} from '../dto';
import { Member, MemberList } from '../entities';

@Injectable()
export class MemberRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  private readonly memberSelect = {
    id: true,
    user: {
      select: {
        id: true,
        name: true,
        email: true,
        avatarKey: true,
        isActive: true,
      },
    },
    role: {
      select: {
        label: true,
      },
    },
  } satisfies Prisma.MemberSelect;

  async findAll(
    organizationId: string,
    filters: FindAllMembersFiltersDTO = {},
  ): Promise<PaginatedResponse<MemberList>> {
    const {
      page = 1,
      limit = 25,
      roleId,
      searchTerm,
      canAccessBackoffice = false,
    } = filters;
    try {
      const where: Prisma.MemberWhereInput = {
        organizationId,
        ...(roleId && { roleId: roleId }),
        ...(canAccessBackoffice !== undefined && {
          role: { canAccessBackoffice },
        }),
        ...(searchTerm && {
          OR: [
            {
              user: {
                name: {
                  contains: searchTerm,
                  mode: 'insensitive',
                },
              },
            },
            {
              user: {
                email: {
                  contains: searchTerm,
                  mode: 'insensitive',
                },
              },
            },
          ],
        }),
      };

      const [data, total] = await Promise.all([
        this.prisma.member.findMany({
          where,
          select: this.memberSelect,
          orderBy: [{ user: { name: 'asc' } }],
        }),
        this.prisma.member.count({ where }),
      ]);

      return {
        data: data.map((member) => ({
          id: member.id,
          name: member.user.name,
          email: member.user.email,
          isActive: member.user.isActive,
          role: member.role.label,
        })),
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      void this.logger.error('MemberRepository.findAll falhou', {
        error: String(error),
        organizationId,
        filters,
      });

      throw new BadRequestException('Erro ao buscar membros');
    }
  }

  async findById(id: string, organizationId: string): Promise<Member | null> {
    try {
      const member = await this.prisma.member.findFirst({
        where: {
          id,
          organizationId,
        },
        select: {
          id: true,
          roleId: true,
          user: {
            select: {
              name: true,
              socialReason: true,
              email: true,
              taxIdentifier: true,
              admissionDate: true,
              birthDate: true,
              phone: true,
              isActive: true,
            },
          },
        },
      });

      if (!member) {
        return null;
      }

      return {
        id: member.id,
        name: member.user.name,
        socialReason: member.user.socialReason,
        email: member.user.email,
        taxIdentifier: member.user.taxIdentifier,
        phone: member.user.phone,
        birthDate: member.user.birthDate,
        admissionDate: member.user.admissionDate,
        roleId: member.roleId,
        isActive: member.user.isActive,
      };
    } catch (error) {
      void this.logger.error('MemberRepository.findById falhou', {
        error: String(error),
        id,
        organizationId,
      });

      throw new BadRequestException('Erro ao buscar membro');
    }
  }

  async findMemberRole(
    organizationId: string,
    userId: string,
  ): Promise<{
    name: string;
    label: string;
    canAccessBackoffice: boolean;
    permissions: Array<{
      module: { id: string; name: string; label: string };
      actions: Action[];
    }>;
    categoryRoleAccesses: Array<{
      id: string;
      categoryId: string;
      organizationId: string;
      category: { id: string; name: string; slug: string };
    }>;
  } | null> {
    try {
      const member = await this.prisma.member.findFirst({
        where: { organizationId, userId, role: { deletedAt: null } },
        select: {
          role: {
            select: {
              label: true,
              name: true,
              canAccessBackoffice: true,
              permissions: {
                select: {
                  id: true,
                  action: true,
                  module: {
                    select: {
                      id: true,
                      name: true,
                      label: true,
                    },
                  },
                },
              },
              categoryRoleAccesses: {
                where: { organizationId },
                select: {
                  id: true,
                  categoryId: true,
                  organizationId: true,
                  category: {
                    select: {
                      id: true,
                      name: true,
                      slug: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!member) {
        return null;
      }

      const { role } = member;

      const permissionsByModule = new Map<
        string,
        {
          module: { id: string; name: string; label: string };
          actions: Set<Action>;
        }
      >();

      for (const permission of role.permissions) {
        const moduleKey = permission.module.id;
        const current = permissionsByModule.get(moduleKey);

        if (current) {
          current.actions.add(permission.action);
          continue;
        }

        permissionsByModule.set(moduleKey, {
          module: permission.module,
          actions: new Set([permission.action]),
        });
      }

      return {
        name: member.role.name,
        label: member.role.label,
        permissions: Array.from(permissionsByModule.values()).map(
          ({ module, actions }) => ({
            module,
            actions: Array.from(actions),
          }),
        ),
        categoryRoleAccesses: role.categoryRoleAccesses,
        canAccessBackoffice: member.role.canAccessBackoffice,
      };
    } catch (error) {
      void this.logger.error('MemberRepository.findMemberRole falhou', {
        error: String(error),
        organizationId,
        userId,
      });

      throw new BadRequestException('Erro ao buscar membro');
    }
  }

  async findMemberRoleDetails(
    organizationId: string,
    userId: string,
  ): Promise<{
    label: string;
    canAccessBackoffice: boolean;
    permissions: Array<{
      module: { id: string; name: string; label: string };
      actions: Action[];
    }>;
    categoryRoleAccesses: Array<{
      id: string;
      categoryId: string;
      organizationId: string;
      category: { id: string; name: string; slug: string };
    }>;
  } | null> {
    try {
      const member = await this.prisma.member.findFirst({
        where: {
          organizationId,
          userId,
          role: { deletedAt: null },
        },
        select: {
          role: {
            select: {
              label: true,
              canAccessBackoffice: true,
              permissions: {
                select: {
                  id: true,
                  action: true,
                  module: {
                    select: {
                      id: true,
                      name: true,
                      label: true,
                    },
                  },
                },
              },
              categoryRoleAccesses: {
                where: { organizationId },
                select: {
                  id: true,
                  categoryId: true,
                  organizationId: true,
                  category: {
                    select: {
                      id: true,
                      name: true,
                      slug: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!member) {
        return null;
      }

      const { role } = member;
      const permissionsByModule = new Map<
        string,
        {
          module: { id: string; name: string; label: string };
          actions: Set<Action>;
        }
      >();

      for (const permission of role.permissions) {
        const moduleKey = permission.module.id;
        const current = permissionsByModule.get(moduleKey);

        if (current) {
          current.actions.add(permission.action);
          continue;
        }

        permissionsByModule.set(moduleKey, {
          module: permission.module,
          actions: new Set([permission.action]),
        });
      }

      return {
        label: role.label,
        canAccessBackoffice: role.canAccessBackoffice,
        permissions: Array.from(permissionsByModule.values()).map(
          ({ module, actions }) => ({
            module,
            actions: Array.from(actions),
          }),
        ),
        categoryRoleAccesses: role.categoryRoleAccesses,
      };
    } catch (error) {
      void this.logger.error('MemberRepository.findMemberRoleDetails falhou', {
        error: String(error),
        organizationId,
        userId,
      });

      throw new BadRequestException('Erro ao buscar perfil do membro');
    }
  }

  async findByOrganizationAndUser(
    organizationId: string,
    userId: string,
  ): Promise<any | null> {
    try {
      return await this.prisma.member.findUnique({
        where: {
          organizationId_userId: {
            organizationId,
            userId,
          },
        },
        select: this.memberSelect,
      });
    } catch (error) {
      void this.logger.error(
        'MemberRepository.findByOrganizationAndUser falhou',
        {
          error: String(error),
          organizationId,
          userId,
        },
      );

      throw new BadRequestException('Erro ao buscar membro');
    }
  }

  async create(
    organizationId: string,
    data: CreateMemberDTO,
    createdBy: string,
  ): Promise<void> {
    try {
      const member = await this.prisma.member.create({
        data: {
          id: generateId(),
          organizationId,
          userId: data.userId,
          roleId: data.roleId,
        },
        select: {
          id: true,
        },
      });

      void this.logger.info('Membro criado', {
        memberId: member.id,
        organizationId,
        createdBy,
        userId: data.userId,
        roleId: data.roleId,
      });
    } catch (error) {
      void this.logger.error('MemberRepository.create falhou', {
        error: String(error),
        organizationId,
        createdBy,
        userId: data.userId,
        roleId: data.roleId,
      });

      throw new BadRequestException('Erro ao criar membro');
    }
  }

  async update(
    id: string,
    organizationId: string,
    data: UpdateMemberDTO,
    updatedBy: string,
  ): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.member.updateMany({
          where: {
            id,
            organizationId,
          },
          data: {
            roleId: data.roleId,
          },
        });

        return tx.member.findFirstOrThrow({
          where: {
            id,
            organizationId,
          },
          select: this.memberSelect,
        });
      });

      void this.logger.info('Membro atualizado', {
        memberId: id,
        organizationId,
        updatedBy,
        roleId: data.roleId,
      });
    } catch (error) {
      void this.logger.error('MemberRepository.update falhou', {
        error: String(error),
        memberId: id,
        organizationId,
        updatedBy,
        roleId: data.roleId,
      });

      throw new BadRequestException('Erro ao atualizar membro');
    }
  }

  async delete(id: string, organizationId: string): Promise<void> {
    try {
      await this.prisma.member.deleteMany({
        where: {
          id,
          organizationId,
        },
      });

      void this.logger.info('Membro removido', {
        memberId: id,
        organizationId,
      });
    } catch (error) {
      void this.logger.error('MemberRepository.delete falhou', {
        error: String(error),
        memberId: id,
        organizationId,
      });

      throw new BadRequestException('Erro ao remover membro');
    }
  }
}
