import { BadRequestException } from '@common/filters';
import { generateId } from '@common/utils';
import { LoggerService } from '@infrastructure/log';
import { PrismaService } from '@infrastructure/prisma';
import { Injectable } from '@nestjs/common';
import { Organization, Prisma } from '@prisma/client';
import { FindAllFilters, PaginatedResponse } from '../../../types';
import { CreateOrganizationDTO, UpdateOrganizationDTO } from '../dto';
import { OrganizationEntity, OrganizationList } from '../entities';

@Injectable()
export class OrganizationRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  async findAll(
    filters: FindAllFilters = {},
  ): Promise<PaginatedResponse<OrganizationList>> {
    try {
      const { page = 1, limit = 25, searchTerm } = filters;

      const skip = (page - 1) * limit;

      const where: Prisma.OrganizationWhereInput = {
        isDeleted: false,
        ...(searchTerm && {
          name: { contains: searchTerm, mode: 'insensitive' },
        }),
      };

      const [data, total] = await Promise.all([
        await this.prisma.organization.findMany({
          where,
          select: {
            id: true,
            name: true,
            slug: true,
            createdAt: true,
          },
          skip,
          take: limit,
          orderBy: {
            createdAt: 'desc',
          },
        }),

        await this.prisma.organization.count({
          where: {
            isDeleted: false,
          },
        }),
      ]);

      return {
        data,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error('OrganizationRepository.findAll falhou', {
        error: String(error),
      });
      throw new BadRequestException('Erro ao buscar organizações');
    }
  }

  async findAllSelect(): Promise<{ id: string; name: string }[]> {
    try {
      return await this.prisma.organization.findMany({
        where: {
          isActive: true,
          isDeleted: false,
        },
        orderBy: {
          name: 'asc',
        },
        select: {
          id: true,
          name: true,
        },
      });
    } catch (error) {
      this.logger.error('OrganizationRepository.findAllSelect falhou', {
        error: String(error),
      });
      throw new BadRequestException('Erro ao buscar organizações');
    }
  }

  async findById(id: string): Promise<OrganizationEntity | null> {
    try {
      const organization = await this.prisma.organization.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          slug: true,
          domain: true,
          shouldAttachUsersByDomain: true,
          avatarKey: true,
          isActive: true,
          createdAt: true,
        },
      });

      if (!organization) {
        return null;
      }

      return organization;
    } catch (error) {
      this.logger.error('OrganizationRepository.findById falhou', {
        error: String(error),
      });
      throw new BadRequestException('Erro ao buscar organização');
    }
  }

  async findBySlug(slug: string): Promise<Organization | null> {
    try {
      return await this.prisma.organization.findUnique({
        where: { slug },
      });
    } catch (error) {
      this.logger.error('OrganizationRepository.findBySlug falhou', {
        error: String(error),
      });
      throw new BadRequestException('Erro ao buscar organização');
    }
  }

  async create(
    data: CreateOrganizationDTO & { avatarKey: string | null },
    userId: string,
  ): Promise<void> {
    try {
      const transaction = await this.prisma.$transaction(async (tx) => {
        const organization = await tx.organization.create({
          data: {
            id: generateId(),
            name: data.name,
            slug: data.slug,
            isActive: data.isActive ?? true,
            avatarKey: data.avatarKey ?? null,
            domain: data.domain ?? null,
            shouldAttachUsersByDomain: data.shouldAttachUsersByDomain ?? false,
          },
          select: {
            id: true,
          },
        });

        const role = await tx.role.findFirstOrThrow({
          where: {
            name: 'ADMIN',
            users: {
              some: {
                id: userId,
              },
            },
          },
          select: {
            id: true,
          },
        });

        await tx.member.create({
          data: {
            id: generateId(),
            organizationId: organization.id,
            userId,
            roleId: role.id,
          },
        });

        return organization;
      });

      void this.logger.info('Organização criada', {
        organizationId: transaction.id,
        userId,
      });
    } catch (error) {
      this.logger.error('OrganizationRepository.create falhou', {
        error: String(error),
      });
      throw new BadRequestException('Erro ao criar organização');
    }
  }

  async update(
    id: string,
    data: UpdateOrganizationDTO,
    userId: string,
  ): Promise<void> {
    try {
      await this.prisma.organization.update({
        where: { id },
        data,
      });

      void this.logger.info('Organização atualizada', {
        organizationId: id,
        userId,
      });
    } catch (error) {
      this.logger.error('OrganizationRepository.update falhou', {
        error: String(error),
      });
      throw new BadRequestException('Erro ao atualizar organização');
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.organization.update({
        where: { id },
        data: {
          isActive: false,
        },
      });
    } catch (error) {
      this.logger.error('OrganizationRepository.delete falhou', {
        error: String(error),
      });
      throw new BadRequestException('Erro ao deletar organização');
    }
  }
}
