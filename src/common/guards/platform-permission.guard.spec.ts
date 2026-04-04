import { PrismaService } from '@infrastructure/prisma';
import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Action } from '@prisma/client';
import { Request } from 'express';
import { PlatformPermissionGuard } from './platform-permission.guard';

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
    getHandler: () => jest.fn(),
    getClass: () => jest.fn(),
  } as unknown as ExecutionContext;
}

describe('PlatformPermissionGuard', () => {
  let guard: PlatformPermissionGuard;
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
    guard = new PlatformPermissionGuard(
      reflector as unknown as Reflector,
      prisma as unknown as PrismaService,
    );
  });

  it('deve negar usuário não autenticado mesmo sem permissão requerida', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    const ctx = createExecutionContext({
      headers: { authorization: 'x' },
    });

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('deve negar quando authorization estiver ausente', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    const ctx = createExecutionContext({
      headers: {},
    });

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('retorna undefined quando há usuário mas nenhuma permissão é requerida', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    const ctx = createExecutionContext({
      headers: { authorization: fakeAuthorizationHeader('u1') },
    });

    await expect(guard.canActivate(ctx)).resolves.toBeUndefined();
  });

  it('deve negar formato de permissão inválido', async () => {
    reflector.getAllAndOverride.mockReturnValue('sem-colon');

    const ctx = createExecutionContext({
      headers: { authorization: fakeAuthorizationHeader('u1') },
    });

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    expect(prisma.user.findFirst).not.toHaveBeenCalled();
  });

  it('deve negar action fora do enum', async () => {
    reflector.getAllAndOverride.mockReturnValue('users:PATCH');

    const ctx = createExecutionContext({
      headers: { authorization: fakeAuthorizationHeader('u1') },
    });

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    expect(prisma.user.findFirst).not.toHaveBeenCalled();
  });

  it('deve negar quando globalRole não satisfaz a permissão', async () => {
    reflector.getAllAndOverride.mockReturnValue('users:read');
    prisma.user.findFirst.mockResolvedValue(null);

    const ctx = createExecutionContext({
      headers: { authorization: fakeAuthorizationHeader('u1') },
    });

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('deve permitir ADMIN com permissão na globalRole sem consultar member', async () => {
    reflector.getAllAndOverride.mockReturnValue('users:read');
    prisma.user.findFirst.mockResolvedValue({
      globalRole: {
        id: 'gr1',
        name: 'ADMIN',
        canAccessBackoffice: true,
        permissions: [
          { action: Action.READ, module: { name: 'users' } },
        ],
      },
    });

    const ctx = createExecutionContext({
      headers: { authorization: fakeAuthorizationHeader('admin-id') },
    });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(prisma.member.findFirst).not.toHaveBeenCalled();
  });

  it('deve consultar member quando não é ADMIN', async () => {
    reflector.getAllAndOverride.mockReturnValue('banners:read');
    prisma.user.findFirst.mockResolvedValue({
      globalRole: {
        id: 'gr2',
        name: 'EDITOR',
        canAccessBackoffice: true,
        permissions: [
          { action: Action.READ, module: { name: 'banners' } },
        ],
      },
    });
    prisma.member.findFirst.mockResolvedValue({ id: 'm1' });

    const ctx = createExecutionContext({
      headers: {
        authorization: fakeAuthorizationHeader('editor-id'),
        'x-organization-id': 'org-9',
      },
    });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(prisma.member.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'editor-id',
          organizationId: 'org-9',
        }),
      }),
    );
  });

  it('deve negar quando não é ADMIN e member não tem a role com permissão', async () => {
    reflector.getAllAndOverride.mockReturnValue('banners:read');
    prisma.user.findFirst.mockResolvedValue({
      globalRole: {
        id: 'gr2',
        name: 'EDITOR',
        canAccessBackoffice: true,
        permissions: [
          { action: Action.READ, module: { name: 'banners' } },
        ],
      },
    });
    prisma.member.findFirst.mockResolvedValue(null);

    const ctx = createExecutionContext({
      headers: {
        authorization: fakeAuthorizationHeader('editor-id'),
        'x-organization-id': 'org-9',
      },
    });

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

});
