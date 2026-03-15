import { CacheService } from '@infrastructure/cache';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TokenBlacklistService {
  private readonly blacklistPrefix = 'blacklist:token:';
  private readonly refreshTokenPrefix = 'blacklist:refresh:';

  constructor(
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Adiciona um token à blacklist
   * @param jti JWT ID do token
   * @param expiresIn Tempo de expiração em segundos (padrão: tempo de expiração do JWT)
   */
  async addToBlacklist(jti: string, expiresIn?: number): Promise<void> {
    const ttl = expiresIn || this.getDefaultTokenTTL();
    await this.cacheService.set(
      `${this.blacklistPrefix}${jti}`,
      { blacklisted: true, timestamp: Date.now() },
      ttl,
    );
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
    await this.cacheService.set(
      `${this.refreshTokenPrefix}${jti}`,
      { blacklisted: true, timestamp: Date.now() },
      ttl,
    );
  }

  /**
   * Verifica se um token está na blacklist
   * @param jti JWT ID do token
   */
  async isTokenBlacklisted(jti: string): Promise<boolean> {
    const blacklisted = await this.cacheService.get<{
      blacklisted: boolean;
      timestamp: number;
    }>(`${this.blacklistPrefix}${jti}`);
    return !!blacklisted;
  }

  /**
   * Verifica se um refresh token está na blacklist
   * @param jti JWT ID do refresh token
   */
  async isRefreshTokenBlacklisted(jti: string): Promise<boolean> {
    const blacklisted = await this.cacheService.get<{
      blacklisted: boolean;
      timestamp: number;
    }>(`${this.refreshTokenPrefix}${jti}`);
    return !!blacklisted;
  }

  /**
   * Remove um token da blacklist (útil para testes ou casos especiais)
   * @param jti JWT ID do token
   */
  async removeFromBlacklist(jti: string): Promise<void> {
    await this.cacheService.del(`${this.blacklistPrefix}${jti}`);
  }

  /**
   * Remove um refresh token da blacklist
   * @param jti JWT ID do refresh token
   */
  async removeRefreshTokenFromBlacklist(jti: string): Promise<void> {
    await this.cacheService.del(`${this.refreshTokenPrefix}${jti}`);
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
