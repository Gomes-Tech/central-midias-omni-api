import { BadRequestException } from '@common/filters';
import { CryptographyService } from '@infrastructure/criptography';
import { Inject, Injectable } from '@nestjs/common';
import { TokenPasswordRepository } from '../repository';

@Injectable()
export class VerifyTokenPasswordUseCase {
  constructor(
    @Inject('TokenPasswordRepository')
    private readonly tokenPasswordRepository: TokenPasswordRepository,
    private readonly cryptographyService: CryptographyService,
  ) {}

  /**
   * Valida o token de reset enviado por email.
   * O token no banco é armazenado em hash, então buscamos pelo email e comparamos com compare().
   * O front deve enviar: token (recebido no email) + email (do usuário que solicitou o reset).
   */
  async execute(token: string, email: string) {
    const tokenPassword =
      await this.tokenPasswordRepository.findLatestValidByEmail(email);

    if (!tokenPassword) {
      throw new BadRequestException('Token inválido ou expirado!');
    }

    const tokenMatches = await this.cryptographyService.compare(
      token,
      tokenPassword.token,
    );

    if (!tokenMatches) {
      throw new BadRequestException('Token inválido ou expirado!');
    }

    // Retorna apenas dados seguros para o front (sem o hash do token)
    return {
      email: tokenPassword.email,
      expiresAt: tokenPassword.expiresAt,
    };
  }
}
