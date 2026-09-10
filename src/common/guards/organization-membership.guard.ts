import { IS_PUBLIC_KEY } from '@common/decorators';
import { authorizationToLoginPayload, userCanAccessOrganization } from '@common/utils';
import { PrismaService } from '@infrastructure/prisma';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * Fecha rotas tenant-scoped (após OrganizationMiddleware) a quem não é
 * Member da org do header. Rotas excluídas do middleware não setam
 * `request.organizationId` e são ignoradas (login, /users/me, orgs acessíveis).
 */
@Injectable()
export class OrganizationMembershipGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') {
      return true;
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    if (request.method === 'OPTIONS') {
      return true;
    }

    const organizationId = request.organizationId as string | undefined;
    if (!organizationId) {
      return true;
    }

    const userId =
      request.user?.id ??
      authorizationToLoginPayload(request.headers?.authorization ?? '')?.id;

    if (!userId) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }

    const allowed = await userCanAccessOrganization(
      this.prisma,
      userId,
      organizationId,
    );

    if (!allowed) {
      throw new ForbiddenException('Você não tem acesso a esta organização.');
    }

    return true;
  }
}
