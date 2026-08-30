import { secureCompare } from '@common/utils';
import { JWT_SERVICE } from '@infrastructure/jwt';
import { PrismaService } from '@infrastructure/prisma';
import { TokenBlacklistService } from '@infrastructure/security';
import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import {
  NOTIFICATION_CREATED_EVENT,
  NOTIFICATION_WS_NAMESPACE,
  buildNotificationRoom,
  isSocketCorsOriginAllowed,
} from '../notification.constants';
import { NotificationItem } from '../entities';

type HandshakeAuth = {
  token?: string;
  organizationId?: string;
  apiKey?: string;
};

@Injectable()
@WebSocketGateway({
  namespace: NOTIFICATION_WS_NAMESPACE,
  cors: {
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) => {
      callback(null, isSocketCorsOriginAllowed(origin));
    },
    credentials: false,
  },
})
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(
    @Inject(JWT_SERVICE)
    private readonly jwtService: JwtService,
    private readonly tokenBlacklistService: TokenBlacklistService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const auth = this.readAuth(client);
      const serverApiKey = process.env.SERVER_AUTH_SECRET;

      if (
        !auth.apiKey ||
        !serverApiKey ||
        !secureCompare(auth.apiKey, serverApiKey)
      ) {
        client.disconnect();
        return;
      }

      if (!auth.token || !auth.organizationId) {
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync<{
        id?: string;
        jti?: string;
      }>(auth.token);

      if (!payload.id) {
        client.disconnect();
        return;
      }

      if (payload.jti) {
        const isBlacklisted =
          await this.tokenBlacklistService.isTokenBlacklisted(payload.jti);
        if (isBlacklisted) {
          client.disconnect();
          return;
        }
      }

      const organization = await this.prisma.organization.findUnique({
        where: {
          id: auth.organizationId,
          isActive: true,
          isDeleted: false,
        },
        select: { id: true },
      });

      if (!organization) {
        client.disconnect();
        return;
      }

      await client.join(
        buildNotificationRoom(payload.id, auth.organizationId),
      );
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(_client: Socket): void {
    return;
  }

  emitCreated(
    userId: string,
    organizationId: string,
    notification: NotificationItem,
  ): void {
    if (!this.server) {
      return;
    }

    this.server
      .to(buildNotificationRoom(userId, organizationId))
      .emit(NOTIFICATION_CREATED_EVENT, notification);
  }

  private readAuth(client: Socket): HandshakeAuth {
    const auth = (client.handshake.auth ?? {}) as HandshakeAuth;
    const headerToken = this.extractBearer(
      client.handshake.headers.authorization,
    );
    const headerApiKey = this.firstHeader(
      client.handshake.headers['x-api-key'],
    );
    const headerOrgId = this.firstHeader(
      client.handshake.headers['x-organization-id'],
    );

    return {
      token: auth.token || headerToken,
      organizationId:
        auth.organizationId ||
        this.firstQuery(client.handshake.query.organizationId) ||
        headerOrgId,
      apiKey: auth.apiKey || headerApiKey,
    };
  }

  private extractBearer(value?: string | string[]): string | undefined {
    const header = this.firstHeader(value);
    if (!header) {
      return undefined;
    }

    const [type, token] = header.split(' ');
    return type === 'Bearer' ? token : undefined;
  }

  private firstHeader(value?: string | string[]): string | undefined {
    if (Array.isArray(value)) {
      return value[0];
    }

    return value;
  }

  private firstQuery(value?: string | string[]): string | undefined {
    if (Array.isArray(value)) {
      return value[0];
    }

    return value;
  }
}
