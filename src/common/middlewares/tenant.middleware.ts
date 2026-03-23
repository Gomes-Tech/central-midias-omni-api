// src/tenant/tenant.middleware.ts
import { PrismaService } from '@infrastructure/prisma';
import {
  BadRequestException,
  Injectable,
  NestMiddleware,
  NotFoundException,
} from '@nestjs/common';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  async use(req: any, _res: any, next: () => void) {
    const tenantId = req.headers['x-tenant-id'];

    if (!tenantId) {
      throw new BadRequestException('Permissão insuficiente.');
    }

    const company = await this.prisma.company.findUnique({
      where: { id: tenantId, isActive: true },
      select: {
        id: true,
      },
    });

    if (!company) {
      throw new NotFoundException('Organização não encontrada ou inativa.');
    }

    next();
  }
}
