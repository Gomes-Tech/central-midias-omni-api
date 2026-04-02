// src/tenant/tenant.middleware.ts
import { PrismaService } from '@infrastructure/prisma';
import {
  BadRequestException,
  Injectable,
  NestMiddleware,
  NotFoundException,
} from '@nestjs/common';

@Injectable()
export class OrganizationMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  async use(req: any, _res: any, next: () => void) {
    const organizationId = req.headers['x-organization-id'];

    if (!organizationId) {
      throw new BadRequestException('Permissão insuficiente.');
    }

    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId, isActive: true, isDeleted: false },
      select: {
        id: true,
      },
    });

    if (!organization) {
      throw new NotFoundException('Organização não encontrada ou inativa.');
    }

    next();
  }
}
