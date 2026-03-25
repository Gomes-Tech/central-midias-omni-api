import { generateId } from '@common/utils';
import { JWT_SERVICE } from '@infrastructure/jwt';
import { TokenBlacklistService } from '@infrastructure/security';
import { FindUserByIdUseCase, User } from '@modules/user';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';

@Injectable()
export class RefreshTokenUseCase {
  constructor(
    @Inject(JWT_SERVICE)
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly findUserByIdUseCase: FindUserByIdUseCase,
    private readonly tokenBlacklistService: TokenBlacklistService,
  ) {}

  async execute(refreshToken: string): Promise<Output> {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });

      // Verifica se o refresh token está na blacklist
      if (payload.jti) {
        const isBlacklisted =
          await this.tokenBlacklistService.isRefreshTokenBlacklisted(
            payload.jti,
          );
        if (isBlacklisted) {
          throw new UnauthorizedException('Refresh token foi revogado!');
        }
      }

      const user = await this.findUserByIdUseCase.execute(payload.id);

      // Adiciona o refresh token antigo à blacklist
      if (payload.jti) {
        await this.tokenBlacklistService.addRefreshTokenToBlacklist(
          payload.jti,
        );
      }

      const accessToken = this.generateToken(user);

      const newRefreshToken = this.generateRefreshToken(user);

      return {
        accessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      console.error(error);
      throw new UnauthorizedException('Refresh token inválido ou expirado!');
    }
  }

  private generateToken(user: Pick<User, 'id'>): string {
    const jti = generateId();
    const payload = { id: user.id, jti };
    const options: JwtSignOptions = {
      expiresIn: this.configService.get('jwt.expires'),
    };

    return this.jwtService.sign(payload, options);
  }

  private generateRefreshToken(user: Pick<User, 'id'>): string {
    const jti = generateId();
    const payload = { id: user.id, jti };
    const options: JwtSignOptions = {
      expiresIn: this.configService.get('jwt.refreshExpires'),
      secret: this.configService.get('jwt.refreshSecret'),
    };

    return this.jwtService.sign(payload, options);
  }
}

type Output = {
  accessToken: string;
  refreshToken: string;
};
