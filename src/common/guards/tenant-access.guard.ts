// src/tenant/guards/tenant-access.guard.ts
import { PrismaService } from '@infrastructure/prisma';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

@Injectable()
export class TenantAccessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const tenant = request.tenant;

    if (!user?.tenant) {
      throw new ForbiddenException(
        'Você não tem vínculo com nenhuma organização.',
      );
    }

    if (user.tenant.companyId !== tenant.id) {
      throw new ForbiddenException('Você não tem acesso a esta organização.');
    }

    // Double-check no banco: o JWT pode estar desatualizado
    const membership = await this.prisma.tenantMembership.findUnique({
      where: {
        userId_companyId: {
          userId: user.sub,
          companyId: tenant.id,
        },
      },
      include: { tenantRole: true },
    });

    if (!membership?.isActive) {
      throw new ForbiddenException(
        'Seu acesso a esta organização foi revogado.',
      );
    }

    // Anexa no request para os controllers e guards subsequentes usarem
    request.membership = membership;
    return true;
  }
}
