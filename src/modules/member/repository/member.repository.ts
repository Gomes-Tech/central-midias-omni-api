import { BadRequestException } from '@common/filters';
import { generateId } from '@common/utils';
import { LoggerService } from '@infrastructure/log';
import { PrismaService } from '@infrastructure/prisma';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  CreateMemberDTO,
  CreateMemberWithUserDTO,
  FindAllMembersFiltersDTO,
  UpdateMemberDTO,
} from '../dto';
import { Member } from '../entities';

@Injectable()
export class MemberRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  private readonly memberSelect = {
    id: true,
    organizationId: true,
    userId: true,
    roleId: true,
    createdAt: true,
    updatedAt: true,
    user: {
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        isActive: true,
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
  } satisfies Prisma.MemberSelect;

  async findAll(
    organizationId: string,
    filters: FindAllMembersFiltersDTO = {},
  ): Promise<Member[]> {
    try {
      const where: Prisma.MemberWhereInput = {
        organizationId,
        ...(filters.roleId && { roleId: filters.roleId }),
        ...(filters.userId && { userId: filters.userId }),
        ...(filters.searchTerm && {
          OR: [
            {
              user: {
                name: {
                  contains: filters.searchTerm,
                  mode: 'insensitive',
                },
              },
            },
            {
              user: {
                email: {
                  contains: filters.searchTerm,
                  mode: 'insensitive',
                },
              },
            },
            {
              role: {
                name: {
                  contains: filters.searchTerm,
                  mode: 'insensitive',
                },
              },
            },
            {
              role: {
                label: {
                  contains: filters.searchTerm,
                  mode: 'insensitive',
                },
              },
            },
          ],
        }),
      };

      return await this.prisma.member.findMany({
        where,
        select: this.memberSelect,
        orderBy: [{ user: { name: 'asc' } }],
      });
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
      return await this.prisma.member.findFirst({
        where: {
          id,
          organizationId,
        },
        select: this.memberSelect,
      });
    } catch (error) {
      void this.logger.error('MemberRepository.findById falhou', {
        error: String(error),
        id,
        organizationId,
      });

      throw new BadRequestException('Erro ao buscar membro');
    }
  }

  async findByOrganizationAndUser(
    organizationId: string,
    userId: string,
  ): Promise<Member | null> {
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
  ): Promise<Member> {
    try {
      const member = await this.prisma.member.create({
        data: {
          id: generateId(),
          organizationId,
          userId: data.userId,
          roleId: data.roleId,
        },
        select: this.memberSelect,
      });

      void this.logger.info('Membro criado', {
        memberId: member.id,
        organizationId,
        createdBy,
        userId: data.userId,
        roleId: data.roleId,
      });

      return member;
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

  async createWithNewUser(
    organizationId: string,
    data: CreateMemberWithUserDTO & { password: string },
    createdBy: string,
  ): Promise<Member> {
    try {
      const member = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            id: generateId(),
            name: data.name,
            email: data.email,
            password: data.password,
            taxIdentifier: data.taxIdentifier,
            ...(data.phone !== undefined && { phone: data.phone }),
            ...(data.socialReason !== undefined && {
              socialReason: data.socialReason,
            }),
            ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
            ...(data.isActive !== undefined && { isActive: data.isActive }),
            ...(data.isFirstAccess !== undefined && {
              isFirstAccess: data.isFirstAccess,
            }),
            ...(data.platformRoleId !== undefined && {
              globalRoleId: data.platformRoleId,
            }),
          },
          select: {
            id: true,
          },
        });

        return tx.member.create({
          data: {
            id: generateId(),
            organizationId,
            userId: user.id,
            roleId: data.roleId,
          },
          select: this.memberSelect,
        });
      });

      void this.logger.info('Usuário e membro criados', {
        memberId: member.id,
        organizationId,
        createdBy,
        userId: member.userId,
        roleId: data.roleId,
      });

      return member;
    } catch (error) {
      void this.logger.error('MemberRepository.createWithNewUser falhou', {
        error: String(error),
        organizationId,
        createdBy,
        email: data.email,
        roleId: data.roleId,
      });

      throw new BadRequestException('Erro ao criar usuário e membro');
    }
  }

  async update(
    id: string,
    organizationId: string,
    data: UpdateMemberDTO,
    updatedBy: string,
  ): Promise<Member> {
    try {
      const member = await this.prisma.$transaction(async (tx) => {
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

      return member;
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
