import { ROLES_KEY } from '@common/decorators';
import { PrismaService } from '@infrastructure/prisma';
import { SecurityLoggerService } from '@infrastructure/security';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
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
  url: string;
  method: string;
  ip?: string;
  get(name: string): string | undefined;
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly prisma: PrismaService,
    private securityLogger: SecurityLoggerService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles?.length) return true;

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const { user } = request;

    if (!user) {
      throw new ForbiddenException('Usuário não autenticado.');
    }

    const userId = this.extractUserId(user);
    if (!userId) {
      throw new ForbiddenException('Usuário não autenticado.');
    }

    const companyId = this.extractCompanyId(request);
    if (!companyId) {
      throw new ForbiddenException(
        'Contexto da empresa é obrigatório para validar perfis.',
      );
    }

    const userRoles = await this.prisma.userRole.findMany({
      where: {
        userId,
        companyId,
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

    const hasPermission = userRoles.some(({ role }) =>
      requiredRoles.includes(role.role),
    );

    if (!hasPermission) {
      this.securityLogger.logForbiddenAccess(
        userId,
        request.url,
        request.method,
        request.ip || 'unknown',
        requiredRoles.join(', '),
        request.get('user-agent') || 'unknown',
      );

      throw new ForbiddenException('Acesso negado: Permissão insuficiente.');
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
