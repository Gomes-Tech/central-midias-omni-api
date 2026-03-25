import {
  Public,
  ThrottleLogin,
  ThrottlePasswordReset,
  ThrottleTokenGeneration,
  UserId,
} from '@common/decorators';
import { UnauthorizedException } from '@common/filters';
import { VerifyTokenPasswordUseCase } from '@modules/token-password';
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Request } from 'express';
import {
  ForgotPasswordDTO,
  LoginDTO,
  ResetPasswordDTO,
  VerifyTokenDTO,
} from './dto';
import {
  FirstAccessUserUseCase,
  ForgotPasswordUseCase,
  LogoutUserUseCase,
  RefreshTokenUseCase,
  ResetPasswordUseCase,
  SignInUseCase,
} from './use-cases';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly signInUser: SignInUseCase,
    private readonly logoutUserUseCase: LogoutUserUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly forgotPasswordUseCase: ForgotPasswordUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
    private readonly verifyTokenPasswordUseCase: VerifyTokenPasswordUseCase,
    private readonly firstAccessUserUseCase: FirstAccessUserUseCase,
  ) {}

  @Public()
  @ThrottleLogin()
  @UsePipes(ValidationPipe)
  @Post('/sign-in')
  @HttpCode(HttpStatus.OK)
  async signIn(@Body() dto: LoginDTO, @Req() req: Request) {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';
    const { accessToken, refreshToken } = await this.signInUser.execute(
      dto,
      ip,
      userAgent,
    );

    return { accessToken, refreshToken };
  }

  @Public()
  @Post('/refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: { refreshToken: string }) {
    if (!dto.refreshToken) {
      throw new UnauthorizedException('Refresh token não encontrado');
    }

    const { accessToken, refreshToken: newRefreshToken } =
      await this.refreshTokenUseCase.execute(dto.refreshToken);

    return { accessToken, refreshToken: newRefreshToken };
  }

  @Public()
  @Post('/logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Body() dto: { refreshToken: string }) {
    const [, accessToken] = req.headers.authorization?.split(' ') ?? [];

    // Blacklista os tokens
    await this.logoutUserUseCase.execute(accessToken, dto.refreshToken);

    return { success: true };
  }

  @Post('/first-access')
  @UsePipes(ValidationPipe)
  @HttpCode(HttpStatus.OK)
  async firstAccess(
    @Body() dto: { newPassword: string },
    @UserId() userId: string,
  ) {
    await this.firstAccessUserUseCase.execute(userId, dto.newPassword);
  }

  @Public()
  @ThrottleTokenGeneration()
  @Post('/forgot-password')
  @UsePipes(ValidationPipe)
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDTO) {
    return await this.forgotPasswordUseCase.execute(dto.taxIdentifier);
  }

  @Public()
  @ThrottleTokenGeneration()
  @Post('/verify-token')
  @UsePipes(ValidationPipe)
  @HttpCode(HttpStatus.OK)
  async verifyToken(@Body() dto: VerifyTokenDTO) {
    return await this.verifyTokenPasswordUseCase.execute(dto.token, dto.email);
  }

  @Public()
  @ThrottlePasswordReset()
  @Post('/reset-password')
  @UsePipes(ValidationPipe)
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDTO, @Req() req: Request) {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';
    await this.resetPasswordUseCase.execute(
      dto.token,
      dto.email,
      dto.password,
      ip,
      userAgent,
    );
  }
}
