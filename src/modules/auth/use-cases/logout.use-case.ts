import { JWT_SERVICE } from '@infrastructure/jwt';
import { TokenBlacklistService } from '@infrastructure/security';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class LogoutUserUseCase {
  constructor(
    @Inject(JWT_SERVICE)
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly tokenBlacklistService: TokenBlacklistService,
  ) {}

  async execute(accessToken?: string, refreshToken?: string): Promise<void> {
    if (accessToken) {
      const payload = await this.decodeUsablePayload(accessToken);
      if (payload?.jti) {
        await this.tokenBlacklistService.addToBlacklist(payload.jti);
      }
    }

    if (refreshToken) {
      const payload = await this.decodeUsablePayload(refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });
      if (payload?.jti) {
        await this.tokenBlacklistService.addRefreshTokenToBlacklist(
          payload.jti,
        );
      }
    }
  }

  private async decodeUsablePayload(
    token: string,
    options?: { secret?: string },
  ): Promise<{ jti?: string } | null> {
    try {
      return options
        ? await this.jwtService.verifyAsync(token, options)
        : await this.jwtService.verifyAsync(token);
    } catch {
      return null;
    }
  }
}
