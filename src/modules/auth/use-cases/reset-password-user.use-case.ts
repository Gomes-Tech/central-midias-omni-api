import { SecurityLoggerService } from '@infrastructure/security';
import {
  UpdateTokenPasswordUseCase,
  VerifyTokenPasswordUseCase,
} from '@modules/token-password';
import { FindUserByEmailUseCase, UpdateUserUseCase } from '@modules/user';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ResetPasswordUseCase {
  constructor(
    private readonly verifyTokenPasswordUseCase: VerifyTokenPasswordUseCase,
    private readonly findUserByEmailUseCase: FindUserByEmailUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly updateTokenPasswordUseCase: UpdateTokenPasswordUseCase,
    private readonly securityLogger: SecurityLoggerService,
  ) {}

  async execute(
    token: string,
    email: string,
    password: string,
    ip?: string,
    userAgent?: string,
  ) {
    try {
      // Valida o token antes de permitir alterar a senha
      await this.verifyTokenPasswordUseCase.execute(token, email);

      const user = await this.findUserByEmailUseCase.execute(email);

      await this.updateUserUseCase.execute(
        user.id,
        {
          password,
        },
        user.id,
      );

      await this.updateTokenPasswordUseCase.execute(user.email);

      this.securityLogger.logPasswordResetAttempt(
        email,
        ip || 'unknown',
        true,
        userAgent,
      );
    } catch (error) {
      this.securityLogger.logPasswordResetAttempt(
        email,
        ip || 'unknown',
        false,
        userAgent,
      );
      throw error;
    }
  }
}
