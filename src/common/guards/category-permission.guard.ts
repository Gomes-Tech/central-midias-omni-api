import { authorizationToLoginPayload } from '@common/utils';
import { PrismaService } from '@infrastructure/prisma';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
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

    const categorySlugPath: string = request.query?.path;

    if (!categorySlugPath) return true;
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
      throw new ForbiddenException('Você não tem acesso a esta organização.');
    }

    const category = await this.prisma.category.findFirst({
      where: {
        organizationId,
        slugPath: categorySlugPath,
        isActive: true,
        isDeleted: false,
        categoryRoleAccesses: {
          some: {
            role: {
              members: {
                some: {
                  organizationId,
                  userId: userId,
                },
              },
            },
          },
        },
      },
    });

    if (!category) {
      throw new ForbiddenException(
        'Você não tem acesso ao conteúdo desta categoria.',
      );
    }

    return true;
  }
}
