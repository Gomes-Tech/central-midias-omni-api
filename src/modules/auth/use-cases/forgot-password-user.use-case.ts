import { CreateTokenPasswordUseCase } from '@modules/token-password';
import { FindUserByEmailUseCase } from '@modules/user';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ForgotPasswordUseCase {
  constructor(
    private readonly findUserByEmailUseCase: FindUserByEmailUseCase,
    private readonly createTokenPasswordUseCase: CreateTokenPasswordUseCase,
  ) {}

  async execute(email: string) {
    // Proteção contra Enumeration Attack:
    // Sempre retornar sucesso, mesmo se email não existir
    // Não revelar se o email está cadastrado no sistema
    const user = await this.findUserByEmailUseCase
      .execute(email)
      .catch(() => null);

    // Só criar token e enviar email se o usuário existir
    if (user) {
      await this.createTokenPasswordUseCase.execute(user.email);
    }
  }
}
