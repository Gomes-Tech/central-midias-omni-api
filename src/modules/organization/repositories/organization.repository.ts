import { BadRequestException } from '@common/filters';
import { generateId } from '@common/utils';
import { LoggerService } from '@infrastructure/log';
import { PrismaService } from '@infrastructure/prisma';
import { Injectable } from '@nestjs/common';
import { Organization } from '@prisma/client';
import { CreateOrganizationDTO, UpdateOrganizationDTO } from '../dto';

@Injectable()
export class OrganizationRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  async findAll(): Promise<Organization[]> {
    try {
      return await this.prisma.organization.findMany({
        where: {
          isActive: true,
        },
        orderBy: {
          name: 'asc',
        },
      });
    } catch (error) {
      this.logger.error('OrganizationRepository.findAll falhou', error);
      throw new BadRequestException('Erro ao buscar organizações');
    }
  }

  async findById(id: string): Promise<Organization | null> {
    try {
      const organization = await this.prisma.organization.findUnique({
        where: { id },
      });

      if (!organization) {
        return null;
      }

      return organization;
    } catch (error) {
      this.logger.error('OrganizationRepository.findById falhou', error);
      throw new BadRequestException('Erro ao buscar organização');
    }
  }

  async findBySlug(slug: string): Promise<Organization | null> {
    try {
      return await this.prisma.organization.findUnique({
        where: { slug },
      });
    } catch (error) {
      this.logger.error('OrganizationRepository.findBySlug falhou', error);
      throw new BadRequestException('Erro ao buscar organização');
    }
  }

  async create(
    data: CreateOrganizationDTO & { avatarUrl: string | null },
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
            avatarUrl: data.avatarUrl ?? null,
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
      this.logger.error('OrganizationRepository.create falhou', error);
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
      this.logger.error('OrganizationRepository.update falhou', error);
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
      this.logger.error('OrganizationRepository.delete falhou', error);
      throw new BadRequestException('Erro ao deletar organização');
    }
  }
}
