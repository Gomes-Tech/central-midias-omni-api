// src/auth/guards/platform-permission.guard.ts
// Usado no backoffice (/admin/*).
// Vai no banco buscar as permissões da role do usuário.
// Não precisa estar no JWT porque só bate uma vez por request e o dado raramente muda.
import { PERMISSION_KEY } from '@common/decorators';
import { authorizationToLoginPayload } from '@common/utils';
import { PrismaService } from '@infrastructure/prisma';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Action } from '@prisma/client';

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

    const request = context.switchToHttp().getRequest();

    const { authorization } = request.headers;

    const loginPayload = authorizationToLoginPayload(authorization ?? '');

    const userId = loginPayload?.id;

    if (!userId) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }

    // RBAC global: user -> globalRole -> RolePermission(Module + Action)
    const roleWhere: {
      canAccessBackoffice: boolean;
      permissions?: {
        some: {
          module: { name: string };
          action: Action;
        };
      };
    } = {
      canAccessBackoffice: true,
    };

    if (requiredPermission) {
      const [resourceRaw, actionRaw] = requiredPermission.split(':');
      const resource = resourceRaw?.toLowerCase();
      const action = actionRaw?.toUpperCase();

      if (!resource || !action) {
        throw new ForbiddenException(
          `Acesso negado: permissão "${requiredPermission}" inválida.`,
        );
      }

      const allowedActions = Object.values(Action);
      if (!allowedActions.includes(action as Action)) {
        throw new ForbiddenException(
          `Acesso negado: permissão "${requiredPermission}" inválida.`,
        );
      }

      roleWhere.permissions = {
        some: {
          module: { name: resource },
          action: action as Action,
        },
      };

      const user = await this.prisma.user.findFirst({
        where: {
          id: userId,
          isActive: true,
          isDeleted: false,
          globalRole: {
            ...roleWhere,
          },
        },
        select: {
          globalRole: {
            select: {
              id: true,
              name: true,
              canAccessBackoffice: true,
              permissions: {
                select: {
                  action: true,
                  module: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!user?.globalRole) {
        throw new ForbiddenException(
          `Acesso negado: permissão "${requiredPermission}" necessária.`,
        );
      }

      const hasPermission = user.globalRole.permissions.some((permission) => {
        return (
          permission.module.name === resource && permission.action === action
        );
      });

      if (hasPermission && user.globalRole.name === 'ADMIN') {
        return true;
      }

      const { ['x-organization-id']: organizationId } = request.headers;

      const member = await this.prisma.member.findFirst({
        where: {
          userId: userId,
          organizationId,
          role: {
            canAccessBackoffice: true,
            permissions: {
              some: {
                module: { name: resource },
                action: action as Action,
              },
            },
          },
        },
        select: {
          id: true,
        },
      });

      if (!member) {
        throw new ForbiddenException(
          `Acesso negado: permissão "${requiredPermission}" necessária.`,
        );
      }

      return true;
    }
  }
}
