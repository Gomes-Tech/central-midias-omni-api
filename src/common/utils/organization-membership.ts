import { PrismaService } from '@infrastructure/prisma';

type MembershipPrisma = Pick<PrismaService, 'user' | 'member'>;

export async function userHasPlatformAdminRole(
  prisma: Pick<PrismaService, 'user'>,
  userId: string,
): Promise<boolean> {
  const platformAdmin = await prisma.user.findFirst({
    where: {
      id: userId,
      isActive: true,
      isDeleted: false,
      globalRole: {
        name: 'ADMIN',
        canAccessBackoffice: true,
      },
    },
    select: { id: true },
  });

  return Boolean(platformAdmin);
}

/**
 * ADMIN de plataforma (globalRole ADMIN + backoffice) pode operar em qualquer org.
 * Demais usuários precisam de Member na organização informada.
 */
export async function userCanAccessOrganization(
  prisma: MembershipPrisma,
  userId: string,
  organizationId: string,
): Promise<boolean> {
  if (await userHasPlatformAdminRole(prisma, userId)) {
    return true;
  }

  const member = await prisma.member.findFirst({
    where: {
      userId,
      organizationId,
      user: { isActive: true, isDeleted: false },
    },
    select: { id: true },
  });

  return Boolean(member);
}
