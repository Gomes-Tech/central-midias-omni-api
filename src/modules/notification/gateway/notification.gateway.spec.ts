import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@infrastructure/prisma';
import { TokenBlacklistService } from '@infrastructure/security';
import { Socket } from 'socket.io';
import { NotificationGateway } from './notification.gateway';
import { NOTIFICATION_CREATED_EVENT } from '../notification.constants';

function makeClient(auth: Record<string, unknown> = {}): Socket {
  return {
    handshake: {
      auth,
      headers: {},
      query: {},
    },
    join: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn(),
  } as unknown as Socket;
}

describe('NotificationGateway', () => {
  const originalSecret = process.env.SERVER_AUTH_SECRET;
  let jwtService: { verifyAsync: jest.Mock };
  let tokenBlacklistService: { isTokenBlacklisted: jest.Mock };
  let prisma: {
    organization: { findUnique: jest.Mock };
    user: { findFirst: jest.Mock };
    member: { findFirst: jest.Mock };
  };
  let gateway: NotificationGateway;
  let emit: jest.Mock;
  let to: jest.Mock;

  beforeEach(() => {
    process.env.SERVER_AUTH_SECRET = 'server-secret-key';
    jwtService = { verifyAsync: jest.fn() };
    tokenBlacklistService = { isTokenBlacklisted: jest.fn() };
    prisma = {
      organization: { findUnique: jest.fn() },
      user: { findFirst: jest.fn() },
      member: { findFirst: jest.fn() },
    };
    emit = jest.fn();
    to = jest.fn().mockReturnValue({ emit });

    gateway = new NotificationGateway(
      jwtService as unknown as JwtService,
      tokenBlacklistService as unknown as TokenBlacklistService,
      prisma as unknown as PrismaService,
    );
    gateway.server = { to } as never;
  });

  afterEach(() => {
    process.env.SERVER_AUTH_SECRET = originalSecret;
  });

  it('deve desconectar quando a API key for inválida', async () => {
    const client = makeClient({
      apiKey: 'wrong',
      token: 't',
      organizationId: 'org-1',
    });

    await gateway.handleConnection(client);

    expect(client.disconnect).toHaveBeenCalled();
    expect(client.join).not.toHaveBeenCalled();
  });

  it('deve entrar na sala do usuário autenticado', async () => {
    jwtService.verifyAsync.mockResolvedValue({ id: 'user-1', jti: 'jti-1' });
    tokenBlacklistService.isTokenBlacklisted.mockResolvedValue(false);
    prisma.organization.findUnique.mockResolvedValue({ id: 'org-1' });
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.member.findFirst.mockResolvedValue({ id: 'member-1' });
    const client = makeClient({
      apiKey: 'server-secret-key',
      token: 'jwt',
      organizationId: 'org-1',
    });

    await gateway.handleConnection(client);

    expect(client.join).toHaveBeenCalledWith('user:user-1:org:org-1');
    expect(client.disconnect).not.toHaveBeenCalled();
  });

  it('deve desconectar quando o usuário não for membro da organização', async () => {
    jwtService.verifyAsync.mockResolvedValue({ id: 'user-1', jti: 'jti-1' });
    tokenBlacklistService.isTokenBlacklisted.mockResolvedValue(false);
    prisma.organization.findUnique.mockResolvedValue({ id: 'org-2' });
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.member.findFirst.mockResolvedValue(null);
    const client = makeClient({
      apiKey: 'server-secret-key',
      token: 'jwt',
      organizationId: 'org-2',
    });

    await gateway.handleConnection(client);

    expect(client.disconnect).toHaveBeenCalled();
    expect(client.join).not.toHaveBeenCalled();
  });

  it('deve emitir a notificação criada para a sala do destinatário', () => {
    const notification = {
      id: 'n1',
      type: 'MATERIAL_CREATED' as const,
      title: 'Novo material disponível',
      body: 'Peça · Categoria',
      href: '/material/m1',
      resourceType: 'material',
      resourceId: 'm1',
      readAt: null,
      createdAt: new Date('2026-08-30T00:00:00.000Z'),
    };

    gateway.emitCreated('user-1', 'org-1', notification);

    expect(to).toHaveBeenCalledWith('user:user-1:org:org-1');
    expect(emit).toHaveBeenCalledWith(NOTIFICATION_CREATED_EVENT, notification);
  });
});
