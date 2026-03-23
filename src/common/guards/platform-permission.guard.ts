// src/auth/guards/platform-permission.guard.ts
// Usado no backoffice (/admin/*).
// Vai no banco buscar as permissões da role do usuário.
// Não precisa estar no JWT porque só bate uma vez por request e o dado raramente muda.
import { PERMISSION_KEY } from '@common/decorators';
import { PrismaService } from '@infrastructure/prisma';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class PlatformPermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.getAllAndOverride<string>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    const { user } = context.switchToHttp().getRequest();

    // Verifica se a role do usuário tem contexto de plataforma (platform roles)
    const platformRole = await this.prisma.platformRole.findUnique({
      where: { name: user.role },
      include: {
        platformRolePermissions: {
          include: { platformPermission: true },
        },
      },
    });

    if (!platformRole) {
      throw new ForbiddenException(
        'Acesso negado: você não tem acesso ao painel administrativo.',
      );
    }

    // Se não exige permissão específica, só precisava confirmar que é platform role
    if (!requiredPermission) return true;

    const permissions = platformRole.platformRolePermissions.map(
      (rp) =>
        `${rp.platformPermission.resource}:${rp.platformPermission.action}`,
    );

    if (!permissions.includes(requiredPermission)) {
      throw new ForbiddenException(
        `Acesso negado: permissão "${requiredPermission}" necessária.`,
      );
    }

    return true;
  }
}
