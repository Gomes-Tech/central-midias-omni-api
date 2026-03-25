import { authorizationToLoginPayload } from '@common/utils';
import { PrismaService } from '@infrastructure/prisma';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class CategoryPermissionGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const { authorization, ['x-organization-id']: organizationId } =
      request.headers;

    const loginPayload = authorizationToLoginPayload(authorization ?? '');
    const userId = loginPayload?.id;

    const categorySlug: string = request.params.slug;

    if (!categorySlug) return true;
    if (!userId) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }
    if (!organizationId) {
      throw new ForbiddenException('Organização não informada.');
    }

    const member = await this.prisma.member.findFirst({
      where: {
        userId,
        organizationId,
        user: { isActive: true, isDeleted: false },
      },
      select: { roleId: true },
    });

    if (!member) {
      // Se não existe Member para (userId, organizationId), não há acesso à org.
      throw new ForbiddenException('Você não tem acesso a esta organização.');
    }

    const category = await this.prisma.category.findUnique({
      where: {
        organizationId_slug: {
          organizationId,
          slug: categorySlug,
        },
      },
    });

    if (!category || !category.isActive || category.isDeleted) {
      throw new NotFoundException('Categoria não encontrada.');
    }

    const categoryRoleAccess = await this.prisma.categoryRoleAccess.findUnique({
      where: {
        categoryId_roleId_organizationId: {
          categoryId: category.id,
          roleId: member.roleId,
          organizationId,
        },
      },
      select: {
        id: true,
        categoryId: true,
        roleId: true,
        organizationId: true,
      },
    });

    if (!categoryRoleAccess) {
      throw new ForbiddenException(
        'Você não tem acesso ao conteúdo desta categoria.',
      );
    }

    return true;
  }
}
