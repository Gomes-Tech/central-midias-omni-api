// src/tenant/guards/category-permission.guard.ts
import { PrismaService } from '@infrastructure/prisma';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

@Injectable()
export class CategoryPermissionGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const tenant = request.tenant;
    const membership = request.membership; // colocado pelo TenantAccessGuard

    // membership precisa estar no request — esse guard sempre vem depois do TenantAccessGuard
    if (!membership) {
      throw new ForbiddenException('Membership não resolvido.');
    }

    const categorySlug: string = request.params.categorySlug;

    if (!categorySlug) return true;

    const category = await this.prisma.category.findUnique({
      where: {
        companyId_slug: {
          companyId: tenant.id,
          slug: categorySlug,
        },
      },
    });

    if (!category || !category.isActive || category.isDeleted) {
      throw new NotFoundException('Categoria não encontrada.');
    }

    const permission = await this.prisma.categoryPermission.findUnique({
      where: {
        tenantRoleId_categoryId: {
          tenantRoleId: membership.tenantRoleId,
          categoryId: category.id,
        },
      },
    });

    if (!permission?.canView) {
      throw new ForbiddenException(
        'Você não tem acesso ao conteúdo desta categoria.',
      );
    }

    request.category = category;
    request.categoryPermission = permission;
    return true;
  }
}
