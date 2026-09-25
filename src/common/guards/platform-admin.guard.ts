import {
  authorizationToLoginPayload,
  userHasPlatformAdminRole,
} from '@common/utils';
import { PrismaService } from '@infrastructure/prisma';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userId =
      request.user?.id ??
      authorizationToLoginPayload(request.headers?.authorization ?? '')?.id;

    if (!userId) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }

    const isPlatformAdmin = await userHasPlatformAdminRole(this.prisma, userId);

    if (!isPlatformAdmin) {
      throw new ForbiddenException(
        'Apenas administradores da plataforma podem gerir perfis globais.',
      );
    }

    return true;
  }
}
