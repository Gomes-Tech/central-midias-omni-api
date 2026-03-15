import { ROLES_KEY } from '@common/decorators';
import { SecurityLoggerService } from '@infrastructure/security';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from 'types';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private securityLogger: SecurityLoggerService,
  ) {}

  private readonly roleHierarchy: Record<UserRole, number> = {
    ADMIN: 8,
    COLLABORATOR: 7,
    OWN_DIRECT_CHANNEL: 6,
    AGENT_DIRECT_CHANNEL: 5,
    SMALL_MASTER_AGENT: 4,
    MEDIUM_MASTER_AGENT: 3,
    LARGE_MASTER_AGENT: 2,
    PARTNER: 1,
    AGENT_EMPLOYEE: 0,
  };

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles?.length) return true;

    const request = context.switchToHttp().getRequest();
    const { user } = request;

    if (!user) {
      throw new ForbiddenException('Usuário não autenticado.');
    }

    const hasPermission = requiredRoles.some(
      (requiredRole) =>
        this.roleHierarchy[user.role] >= this.roleHierarchy[requiredRole],
    );

    if (!hasPermission) {
      this.securityLogger.logForbiddenAccess(
        user.id,
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
}
