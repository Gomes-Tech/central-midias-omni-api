import { UnauthorizedException } from '@common/filters';
import { secureCompare } from '@common/utils';
import { JWT_SERVICE } from '@infrastructure/jwt';
import {
  SecurityLoggerService,
  TokenBlacklistService,
} from '@infrastructure/security';
import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(JWT_SERVICE)
    private jwtService: JwtService,
    private reflector: Reflector,
    private securityLogger: SecurityLoggerService,
    private tokenBlacklistService: TokenBlacklistService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const apiKey = request.headers['x-api-key'] as string;

    const serverApiKey = process.env.SERVER_AUTH_SECRET;

    // Usar comparação segura contra timing attacks
    if (!apiKey || !serverApiKey || !secureCompare(apiKey, serverApiKey)) {
      throw new UnauthorizedException('Authentication required');
    }

    if (request.method === 'OPTIONS') {
      return true;
    }

    const token = this.extractTokenFromHeader(request);
    const ip = request.ip || request.connection?.remoteAddress || 'unknown';
    const userAgent = request.get('user-agent') || 'unknown';
    const endpoint = request.url;
    const method = request.method;

    if (!token) {
      this.securityLogger.logUnauthorizedAccess(
        endpoint,
        method,
        ip,
        undefined,
        userAgent,
      );
      throw new UnauthorizedException();
    }
    try {
      const payload = await this.jwtService.verifyAsync(token);

      // Verifica se o token está na blacklist
      if (payload.jti) {
        const isBlacklisted =
          await this.tokenBlacklistService.isTokenBlacklisted(payload.jti);
        if (isBlacklisted) {
          this.securityLogger.logInvalidToken(
            ip,
            endpoint,
            userAgent,
            'Token foi revogado (blacklist)',
          );
          throw new UnauthorizedException('Token foi revogado!');
        }
      }

      request['user'] = payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.securityLogger.logInvalidToken(
        ip,
        endpoint,
        userAgent,
        error instanceof Error ? error.message : 'Token inválido ou expirado',
      );
      throw new UnauthorizedException('Token inválido ou expirado!');
    }
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
