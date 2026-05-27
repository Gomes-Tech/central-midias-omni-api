import { PrismaService } from '@infrastructure/prisma';
import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { CategoryPermissionGuard } from './category-permission.guard';

function fakeAuthorizationHeader(userId: string): string {
  const payload = Buffer.from(JSON.stringify({ id: userId }), 'utf8').toString(
    'base64',
  );
  return `h.${payload}.s`;
}

function createExecutionContext(request: Partial<Request>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request as Request,
    }),
  } as unknown as ExecutionContext;
}

describe('CategoryPermissionGuard', () => {
  let guard: CategoryPermissionGuard;
  let prisma: {
    member: { findFirst: jest.Mock };
    category: { findFirst: jest.Mock };
  };

  beforeEach(() => {
    prisma = {
      member: { findFirst: jest.fn() },
      category: { findFirst: jest.fn() },
    };
    guard = new CategoryPermissionGuard(prisma as unknown as PrismaService);
  });

  it('deve permitir quando não há path na query', async () => {
    const ctx = createExecutionContext({
      headers: { authorization: fakeAuthorizationHeader('u1') },
      query: {},
    });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(prisma.member.findFirst).not.toHaveBeenCalled();
  });

  it('deve tratar authorization ausente como string vazia', async () => {
    const ctx = createExecutionContext({
      headers: { 'x-organization-id': 'org-1' },
      query: { path: 'marketing/videos' },
    });

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('deve negar quando usuário não está no payload', async () => {
    const ctx = createExecutionContext({
      headers: { authorization: 'invalid' },
      query: { path: 'marketing/videos' },
    });

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('deve negar quando x-organization-id está ausente', async () => {
    const ctx = createExecutionContext({
      headers: { authorization: fakeAuthorizationHeader('u1') },
      query: { path: 'marketing/videos' },
    });

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('deve negar quando não há membro na organização', async () => {
    prisma.member.findFirst.mockResolvedValue(null);

    const ctx = createExecutionContext({
      headers: {
        authorization: fakeAuthorizationHeader('u1'),
        'x-organization-id': 'org-1',
      },
      query: { path: 'marketing/videos' },
    });

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    expect(prisma.category.findFirst).not.toHaveBeenCalled();
  });

  it('deve negar quando categoria não existe ou usuário não tem acesso', async () => {
    prisma.member.findFirst.mockResolvedValue({ roleId: 'r1' });
    prisma.category.findFirst.mockResolvedValue(null);

    const ctx = createExecutionContext({
      headers: {
        authorization: fakeAuthorizationHeader('u1'),
        'x-organization-id': 'org-1',
      },
      query: { path: 'marketing/videos' },
    });

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    expect(prisma.category.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: 'org-1',
          slugPath: 'marketing/videos',
        }),
      }),
    );
  });

  it('deve permitir quando membro e categoria com acesso existem', async () => {
    prisma.member.findFirst.mockResolvedValue({ roleId: 'r1' });
    prisma.category.findFirst.mockResolvedValue({ id: 'c1' });

    const ctx = createExecutionContext({
      headers: {
        authorization: fakeAuthorizationHeader('u1'),
        'x-organization-id': 'org-1',
      },
      query: { path: 'marketing/videos' },
    });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });
});
