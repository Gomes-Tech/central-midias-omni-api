import { REDIS_CLIENT } from '@infrastructure/redis';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type Redis from 'ioredis';

@Injectable()
export class TokenBlacklistService {
  private readonly blacklistPrefix = 'blacklist:token:';
  private readonly refreshTokenPrefix = 'blacklist:refresh:';

  constructor(
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Adiciona um token à blacklist
   * @param jti JWT ID do token
   * @param expiresIn Tempo de expiração em segundos (padrão: tempo de expiração do JWT)
   */
  async addToBlacklist(jti: string, expiresIn?: number): Promise<void> {
    const ttl = expiresIn || this.getDefaultTokenTTL();
    await this.redis.set(`${this.blacklistPrefix}${jti}`, '1', 'EX', ttl);
  }

  /**
   * Adiciona um refresh token à blacklist
   * @param jti JWT ID do refresh token
   * @param expiresIn Tempo de expiração em segundos (padrão: tempo de expiração do refresh token)
   */
  async addRefreshTokenToBlacklist(
    jti: string,
    expiresIn?: number,
  ): Promise<void> {
    const ttl = expiresIn || this.getDefaultRefreshTokenTTL();
    await this.redis.set(`${this.refreshTokenPrefix}${jti}`, '1', 'EX', ttl);
  }

  /**
   * Verifica se um token está na blacklist.
   * Erros de Redis propagam (fail-closed): o caller deve negar o token.
   */
  async isTokenBlacklisted(jti: string): Promise<boolean> {
    const value = await this.redis.get(`${this.blacklistPrefix}${jti}`);
    return value !== null;
  }

  /**
   * Verifica se um refresh token está na blacklist.
   * Erros de Redis propagam (fail-closed): o caller deve negar o token.
   */
  async isRefreshTokenBlacklisted(jti: string): Promise<boolean> {
    const value = await this.redis.get(`${this.refreshTokenPrefix}${jti}`);
    return value !== null;
  }

  /**
   * Remove um token da blacklist (útil para testes ou casos especiais)
   * @param jti JWT ID do token
   */
  async removeFromBlacklist(jti: string): Promise<void> {
    await this.redis.del(`${this.blacklistPrefix}${jti}`);
  }

  /**
   * Remove um refresh token da blacklist
   * @param jti JWT ID do refresh token
   */
  async removeRefreshTokenFromBlacklist(jti: string): Promise<void> {
    await this.redis.del(`${this.refreshTokenPrefix}${jti}`);
  }

  /**
   * Obtém o TTL padrão do access token em segundos
   */
  private getDefaultTokenTTL(): number {
    const expires = this.configService.get<string>('jwt.expires') || '15m';
    return this.parseExpirationToSeconds(expires);
  }

  /**
   * Obtém o TTL padrão do refresh token em segundos
   */
  private getDefaultRefreshTokenTTL(): number {
    const expires =
      this.configService.get<string>('jwt.refreshExpires') || '7d';
    return this.parseExpirationToSeconds(expires);
  }

  /**
   * Converte uma string de expiração (ex: "15m", "7d") para segundos
   */
  private parseExpirationToSeconds(expires: string): number {
    const match = expires.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 900; // 15 minutos padrão
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 24 * 60 * 60;
      default:
        return 900; // 15 minutos padrão
    }
  }
}
