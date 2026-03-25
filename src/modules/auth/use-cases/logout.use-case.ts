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
    // Blacklista o access token se fornecido
    if (accessToken) {
      try {
        const payload = await this.jwtService.verifyAsync(accessToken);
        if (payload.jti) {
          await this.tokenBlacklistService.addToBlacklist(payload.jti);
        }
      } catch (error) {
        // Se o token já expirou, não precisa blacklistar
        // Mas se for inválido por outro motivo, ainda tentamos
        if (error instanceof Error && error.name !== 'TokenExpiredError') {
          // Token inválido, mas não fazemos nada
        }
      }
    }

    // Blacklista o refresh token se fornecido
    if (refreshToken) {
      try {
        const payload = await this.jwtService.verifyAsync(refreshToken, {
          secret: this.configService.get<string>('jwt.refreshSecret'),
        });
        if (payload.jti) {
          await this.tokenBlacklistService.addRefreshTokenToBlacklist(
            payload.jti,
          );
        }
      } catch (error) {
        // Se o token já expirou, não precisa blacklistar
        if (error instanceof Error && error.name !== 'TokenExpiredError') {
          // Token inválido, mas não fazemos nada
        }
      }
    }
  }
}
