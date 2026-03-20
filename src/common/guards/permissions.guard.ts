import { PERMISSION_KEY, RequiredPermission } from '@common/decorators';
import { ForbiddenException } from '@common/filters';
import { PrismaService } from '@infrastructure/prisma';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

type AuthenticatedUser = {
  id?: string;
  sub?: string;
  companyId?: string;
  companyIds?: string[];
  company?: {
    id?: string;
  };
};

type RequestWithUser = {
  user?: AuthenticatedUser;
  headers: Record<string, string | string[] | undefined>;
  params?: Record<string, unknown>;
  query?: Record<string, unknown>;
  body?: Record<string, unknown>;
};

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const requiredPermission =
      this.reflector.getAllAndOverride<RequiredPermission>(PERMISSION_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);

    if (!requiredPermission) {
      return true;
    }

    const request =
      context.switchToHttp().getRequest<RequestWithUser | undefined>();

    const userId = this.extractUserId(request?.user);
    if (!userId) {
      throw new ForbiddenException('Usuário não autenticado.');
    }

    const companyId = this.extractCompanyId(request);
    if (!companyId) {
      throw new ForbiddenException(
        'Contexto da empresa é obrigatório para validar permissões.',
      );
    }

    const userRoles = await this.prisma.userRole.findMany({
      where: {
        userId,
        companyId,
      },
      select: {
        roleId: true,
      },
    });

    if (!userRoles.length) {
      throw new ForbiddenException('Acesso negado: usuário sem perfil nesta empresa.');
    }

    const allowed = await this.prisma.categoryRolePermission.findFirst({
      where: {
        roleId: {
          in: userRoles.map(({ roleId }) => roleId),
        },
        category: {
          slug: requiredPermission.category,
          isActive: true,
          isDeleted: false,
        },
        action: {
          name: requiredPermission.action,
        },
        role: {
          deletedAt: null,
        },
      },
      select: {
        id: true,
      },
    });

    if (!allowed) {
      throw new ForbiddenException('Acesso negado: permissão insuficiente.');
    }

    return true;
  }

  private extractUserId(user?: AuthenticatedUser): string | null {
    return user?.id ?? user?.sub ?? null;
  }

  private extractCompanyId(request?: RequestWithUser): string | null {
    const headerValue = request?.headers?.['x-company-id'];
    const companyIdFromHeader = Array.isArray(headerValue)
      ? headerValue[0]
      : headerValue;

    const companyIdCandidates = [
      request?.user?.companyId,
      request?.user?.company?.id,
      request?.user?.companyIds?.[0],
      companyIdFromHeader,
      this.readStringValue(request?.params?.companyId),
      this.readStringValue(request?.query?.companyId),
      this.readStringValue(request?.body?.companyId),
    ];

    return (
      companyIdCandidates.find(
        (candidate): candidate is string =>
          typeof candidate === 'string' && candidate.trim().length > 0,
      ) ?? null
    );
  }

  private readStringValue(value: unknown): string | null {
    return typeof value === 'string' && value.trim().length > 0 ? value : null;
  }
}
