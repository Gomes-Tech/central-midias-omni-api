import { IS_PUBLIC_KEY } from '@common/decorators';
import { PrismaService } from '@infrastructure/prisma';
import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { OrganizationMembershipGuard } from './organization-membership.guard';

function fakeAuthorizationHeader(userId: string): string {
  const payload = Buffer.from(JSON.stringify({ id: userId }), 'utf8').toString(
    'base64',
  );
  return `h.${payload}.s`;
}

function createExecutionContext(
  request: Partial<Request> & { organizationId?: string; user?: { id: string } },
  type: string = 'http',
): ExecutionContext {
  return {
    getType: () => type,
    switchToHttp: () => ({
      getRequest: () => request as Request,
    }),
    getHandler: () => jest.fn(),
    getClass: () => jest.fn(),
  } as unknown as ExecutionContext;
}

describe('OrganizationMembershipGuard', () => {
  let guard: OrganizationMembershipGuard;
  let reflector: { getAllAndOverride: jest.Mock };
  let prisma: {
    user: { findFirst: jest.Mock };
    member: { findFirst: jest.Mock };
  };

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    prisma = {
      user: { findFirst: jest.fn() },
      member: { findFirst: jest.fn() },
    };
    guard = new OrganizationMembershipGuard(
      reflector as unknown as Reflector,
      prisma as unknown as PrismaService,
    );
  });

  it('deve ignorar contextos que não são HTTP', async () => {
    const ctx = createExecutionContext({}, 'ws');

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(prisma.user.findFirst).not.toHaveBeenCalled();
  });

  it('deve ignorar rotas públicas', async () => {
    reflector.getAllAndOverride.mockImplementation((key: unknown) =>
      key === IS_PUBLIC_KEY ? true : undefined,
    );
    const ctx = createExecutionContext({
      method: 'GET',
      organizationId: 'org-1',
      headers: {},
    });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(prisma.member.findFirst).not.toHaveBeenCalled();
  });

  it('deve ignorar OPTIONS', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const ctx = createExecutionContext({
      method: 'OPTIONS',
      organizationId: 'org-1',
      headers: {},
    });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('deve ignorar quando o middleware de org não validou o tenant', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const ctx = createExecutionContext({
      method: 'GET',
      headers: { authorization: fakeAuthorizationHeader('u1') },
    });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(prisma.user.findFirst).not.toHaveBeenCalled();
  });

  it('deve negar sem usuário autenticado quando a org foi validada', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const ctx = createExecutionContext({
      method: 'GET',
      organizationId: 'org-1',
      headers: {},
    });

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('deve permitir membro da organização', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.member.findFirst.mockResolvedValue({ id: 'm1' });
    const ctx = createExecutionContext({
      method: 'GET',
      organizationId: 'org-a',
      user: { id: 'user-1' },
      headers: { authorization: fakeAuthorizationHeader('user-1') },
    });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('deve permitir ADMIN de plataforma em org sem membership', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    prisma.user.findFirst.mockResolvedValue({ id: 'admin-1' });
    const ctx = createExecutionContext({
      method: 'GET',
      organizationId: 'org-b',
      user: { id: 'admin-1' },
      headers: {},
    });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(prisma.member.findFirst).not.toHaveBeenCalled();
  });

  it('deve negar quem não é membro da org do header', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.member.findFirst.mockResolvedValue(null);
    const ctx = createExecutionContext({
      method: 'GET',
      organizationId: 'org-b',
      user: { id: 'user-1' },
      headers: {},
    });

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });
});
