import { MailModule } from '@infrastructure/providers';
import { TokenPasswordModule } from '@modules/token-password';
import { UserModule } from '@modules/user';
import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import {
  FirstAccessUserUseCase,
  ForgotPasswordUseCase,
  LogoutUserUseCase,
  RefreshTokenUseCase,
  ResetPasswordUseCase,
  SignInUseCase,
} from './use-cases';

@Module({
  imports: [UserModule, TokenPasswordModule, MailModule],
  controllers: [AuthController],
  providers: [
    SignInUseCase,
    LogoutUserUseCase,
    ForgotPasswordUseCase,
    ResetPasswordUseCase,
    RefreshTokenUseCase,
    FirstAccessUserUseCase,
  ],
  exports: [],
})
export class AuthModule {}
