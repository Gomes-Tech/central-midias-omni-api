import { LoggerService } from '@infrastructure/log';
import { PrismaService } from '@infrastructure/prisma';
import {
  HttpException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { UserRoleAssignment } from '../entities';

type UserRoleWithRelations = Prisma.UserRoleGetPayload<{
  include: {
    role: true;
    company: true;
  };
}>;

@Injectable()
export class UserRolesRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  async findByUserId(userId: string): Promise<UserRoleAssignment[]> {
    try {
      const assignments = await this.prisma.userRole.findMany({
        where: {
          userId,
          role: {
            deletedAt: null,
          },
        },
        include: {
          role: true,
          company: true,
        },
        orderBy: [{ company: { name: 'asc' } }, { role: { label: 'asc' } }],
      });

      return assignments.map((assignment) => this.toEntity(assignment));
    } catch (error) {
      this.handleError('UserRolesRepository.findByUserId falhou', error, {
        userId,
      });
    }
  }

  async findRoleCodesByUserId(userId: string): Promise<string[]> {
    try {
      const assignments = await this.prisma.userRole.findMany({
        where: {
          userId,
          role: {
            deletedAt: null,
          },
        },
        select: {
          role: {
            select: {
              role: true,
            },
          },
        },
      });

      return assignments.map(({ role }) => role.role);
    } catch (error) {
      this.handleError(
        'UserRolesRepository.findRoleCodesByUserId falhou',
        error,
        { userId },
      );
    }
  }

  async findActiveCompanyIds(companyIds: string[]): Promise<string[]> {
    try {
      if (!companyIds.length) {
        return [];
      }

      const companies = await this.prisma.company.findMany({
        where: {
          id: {
            in: [...new Set(companyIds)],
          },
          isActive: true,
        },
        select: {
          id: true,
        },
      });

      return companies.map((company) => company.id);
    } catch (error) {
      this.handleError(
        'UserRolesRepository.findActiveCompanyIds falhou',
        error,
        { companyIds },
      );
    }
  }

  async replaceByUserId(
    userId: string,
    assignments: Array<{ roleId: string; companyId: string }>,
  ): Promise<UserRoleAssignment[]> {
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.userRole.deleteMany({
          where: { userId },
        });

        if (assignments.length) {
          await tx.userRole.createMany({
            data: assignments.map((assignment) => ({
              userId,
              roleId: assignment.roleId,
              companyId: assignment.companyId,
            })),
          });
        }
      });

      void this.logger.info('Perfis do usuário substituídos', {
        userId,
        assignments: assignments.length,
      });

      return this.findByUserId(userId);
    } catch (error) {
      this.handleError('UserRolesRepository.replaceByUserId falhou', error, {
        userId,
      });
    }
  }

  async assign(
    userId: string,
    roleId: string,
    companyId: string,
  ): Promise<UserRoleAssignment> {
    try {
      const assignment = await this.prisma.userRole.create({
        data: {
          userId,
          roleId,
          companyId,
        },
        include: {
          role: true,
          company: true,
        },
      });

      void this.logger.info('Perfil vinculado ao usuário', {
        userId,
        roleId,
        companyId,
      });

      return this.toEntity(assignment);
    } catch (error) {
      this.handleError('UserRolesRepository.assign falhou', error, {
        userId,
        roleId,
        companyId,
      });
    }
  }

  private toEntity(assignment: UserRoleWithRelations): UserRoleAssignment {
    return {
      id: assignment.id,
      userId: assignment.userId,
      roleId: assignment.roleId,
      role: assignment.role.role,
      label: assignment.role.label,
      companyId: assignment.companyId,
      companyName: assignment.company.name,
      createdAt: assignment.createdAt,
      updatedAt: assignment.updatedAt,
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
