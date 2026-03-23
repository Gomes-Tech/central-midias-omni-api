import { PERMISSION_KEY } from '@common/decorators';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * Rotas de tenant (fora de /admin): exige membership resolvido pelo TenantAccessGuard
 * e valida @RequirePermission. Enquanto não houver tabela de permissões por role no tenant,
 * apenas a role ADMIN da organização satisfaz qualquer permissão declarada.
 */
@Injectable()
export class TenantPermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.getAllAndOverride<string>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermission) {
      return true;
    }

    const { membership } = context.switchToHttp().getRequest();

    if (!membership?.tenantRole) {
      throw new ForbiddenException('Membership não resolvido.');
    }

    if (membership.tenantRole.name !== 'ADMIN') {
      throw new ForbiddenException(
        `Acesso negado: permissão "${requiredPermission}" necessária.`,
      );
    }

    return true;
  }
}
