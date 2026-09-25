import { PrismaService } from '@infrastructure/prisma';
import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { PlatformAdminGuard } from './platform-admin.guard';

function fakeAuthorizationHeader(userId: string): string {
  const payload = Buffer.from(JSON.stringify({ id: userId }), 'utf8').toString(
    'base64',
  );
  return `h.${payload}.s`;
}

function createExecutionContext(
  request: Partial<Request> & { user?: { id: string } },
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

describe('PlatformAdminGuard', () => {
  let guard: PlatformAdminGuard;
  let prisma: { user: { findFirst: jest.Mock } };

  beforeEach(() => {
    prisma = { user: { findFirst: jest.fn() } };
    guard = new PlatformAdminGuard(prisma as unknown as PrismaService);
  });

  it('deve ignorar contextos que não são HTTP', async () => {
    await expect(
      guard.canActivate(createExecutionContext({}, 'ws')),
    ).resolves.toBe(true);
    expect(prisma.user.findFirst).not.toHaveBeenCalled();
  });

  it('deve negar sem usuário autenticado', async () => {
    await expect(
      guard.canActivate(
        createExecutionContext({ method: 'POST', headers: {} }),
      ),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('deve permitir ADMIN de plataforma', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 'admin-1' });
    const ctx = createExecutionContext({
      method: 'PATCH',
      user: { id: 'admin-1' },
      headers: {},
    });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('deve negar quem não for ADMIN de plataforma', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    const ctx = createExecutionContext({
      method: 'PATCH',
      headers: { authorization: fakeAuthorizationHeader('editor-1') },
    });

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });
});
