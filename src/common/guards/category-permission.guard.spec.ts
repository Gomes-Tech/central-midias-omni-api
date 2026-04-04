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
    category: { findUnique: jest.Mock };
  };

  beforeEach(() => {
    prisma = {
      member: { findFirst: jest.fn() },
      category: { findUnique: jest.fn() },
    };
    guard = new CategoryPermissionGuard(prisma as unknown as PrismaService);
  });

  it('deve permitir quando não há slug nos params', async () => {
    const ctx = createExecutionContext({
      headers: { authorization: fakeAuthorizationHeader('u1') },
      params: {},
    });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(prisma.member.findFirst).not.toHaveBeenCalled();
  });

  it('deve tratar authorization ausente como string vazia', async () => {
    const ctx = createExecutionContext({
      headers: { 'x-organization-id': 'org-1' },
      params: { slug: 'x' },
    });

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('deve negar quando usuário não está no payload', async () => {
    const ctx = createExecutionContext({
      headers: { authorization: 'invalid' },
      params: { slug: 'cat' },
    });

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('deve negar quando x-organization-id está ausente', async () => {
    const ctx = createExecutionContext({
      headers: { authorization: fakeAuthorizationHeader('u1') },
      params: { slug: 'videos' },
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
      params: { slug: 'videos' },
    });

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    expect(prisma.category.findUnique).not.toHaveBeenCalled();
  });

  it('deve negar quando categoria não existe ou usuário não tem acesso', async () => {
    prisma.member.findFirst.mockResolvedValue({ roleId: 'r1' });
    prisma.category.findUnique.mockResolvedValue(null);

    const ctx = createExecutionContext({
      headers: {
        authorization: fakeAuthorizationHeader('u1'),
        'x-organization-id': 'org-1',
      },
      params: { slug: 'videos' },
    });

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    expect(prisma.category.findUnique).toHaveBeenCalled();
  });

  it('deve permitir quando membro e categoria com acesso existem', async () => {
    prisma.member.findFirst.mockResolvedValue({ roleId: 'r1' });
    prisma.category.findUnique.mockResolvedValue({ id: 'c1' });

    const ctx = createExecutionContext({
      headers: {
        authorization: fakeAuthorizationHeader('u1'),
        'x-organization-id': 'org-1',
      },
      params: { slug: 'videos' },
    });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });
});
