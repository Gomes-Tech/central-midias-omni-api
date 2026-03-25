import { generateToken } from '@common/utils';
import { CryptographyService } from '@infrastructure/criptography';
import { MailService } from '@infrastructure/providers';
import { Inject, Injectable } from '@nestjs/common';
import { TokenPasswordRepository } from '../repository';

@Injectable()
export class CreateTokenPasswordUseCase {
  constructor(
    @Inject('TokenPasswordRepository')
    private readonly tokenPasswordRepository: TokenPasswordRepository,
    private readonly cryptographyService: CryptographyService,
    private readonly mailService: MailService,
  ) {}

  async execute(email: string): Promise<void> {
    const generatedToken = generateToken();

    const encriptToken = await this.cryptographyService.hash(generatedToken);
    await this.tokenPasswordRepository.createToken({
      email: email,
      token: encriptToken,
    });

    if (process.env.NODE_ENV === 'prod') {
      const frontendUrl = process.env.FRONTEND_URL?.replace(/\/$/, '') ?? '';
      const resetLink = frontendUrl
        ? `${frontendUrl}/reset-password`
        : undefined;

      await this.mailService.sendMail({
        to: email,
        subject: 'Recuperação de senha',
        template: 'reset-password',
        context: {
          token: generatedToken,
          resetLink,
          expiresAt: process.env.TOKEN_PASSWORD_EXPIRES_MINUTES ?? 15,
        },
      });
    }
  }
}
