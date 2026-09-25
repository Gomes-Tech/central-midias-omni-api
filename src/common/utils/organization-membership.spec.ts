import {
  userCanAccessOrganization,
  userHasPlatformAdminRole,
} from './organization-membership';

describe('userCanAccessOrganization', () => {
  const prisma = {
    user: { findFirst: jest.fn() },
    member: { findFirst: jest.fn() },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve permitir ADMIN de plataforma sem consultar member', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 'admin-1' });

    await expect(
      userCanAccessOrganization(prisma as never, 'admin-1', 'org-b'),
    ).resolves.toBe(true);
    expect(prisma.member.findFirst).not.toHaveBeenCalled();
  });

  it('deve permitir membro da organização', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.member.findFirst.mockResolvedValue({ id: 'm-1' });

    await expect(
      userCanAccessOrganization(prisma as never, 'user-1', 'org-a'),
    ).resolves.toBe(true);
    expect(prisma.member.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'user-1',
          organizationId: 'org-a',
        }),
      }),
    );
  });

  it('deve recusar quem não é membro nem ADMIN', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.member.findFirst.mockResolvedValue(null);

    await expect(
      userCanAccessOrganization(prisma as never, 'user-1', 'org-b'),
    ).resolves.toBe(false);
  });
});

describe('userHasPlatformAdminRole', () => {
  const prisma = {
    user: { findFirst: jest.fn() },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve retornar true para ADMIN com acesso ao backoffice', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 'admin-1' });

    await expect(
      userHasPlatformAdminRole(prisma as never, 'admin-1'),
    ).resolves.toBe(true);
  });

  it('deve retornar false quando o usuário não for ADMIN', async () => {
    prisma.user.findFirst.mockResolvedValue(null);

    await expect(
      userHasPlatformAdminRole(prisma as never, 'editor-1'),
    ).resolves.toBe(false);
  });
});
