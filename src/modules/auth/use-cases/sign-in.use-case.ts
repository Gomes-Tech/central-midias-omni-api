import { LoginException } from '@common/filters';
import { generateId } from '@common/utils';
import { CryptographyService } from '@infrastructure/criptography';
import { JWT_SERVICE } from '@infrastructure/jwt';
import { SecurityLoggerService } from '@infrastructure/security';
import { FindUserByEmailUseCase, User } from '@modules/user';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { LoginDTO } from '../dto';

@Injectable()
export class SignInUseCase {
  constructor(
    private readonly findUserByEmailUseCase: FindUserByEmailUseCase,
    @Inject(JWT_SERVICE)
    private readonly jwtService: JwtService,
    private readonly cryptographyService: CryptographyService,
    private readonly securityLogger: SecurityLoggerService,
    private readonly configService: ConfigService,
  ) {}

  async execute(dto: LoginDTO, ip?: string, userAgent?: string) {
    const userExisting = await this.findUserByEmailUseCase.execute(dto.email);

    // Hash dummy para manter tempo de resposta consistente
    // Isso previne timing attacks que poderiam revelar se email existe
    const dummyHash =
      '$2b$10$dummy.hash.to.prevent.timing.attacks.and.enumeration';

    // Sempre fazer comparação de hash, mesmo se usuário não existir
    // Isso garante que o tempo de resposta seja similar em ambos os casos
    const passwordMatch = userExisting
      ? await this.cryptographyService.compare(
          dto.password,
          userExisting.password,
        )
      : await this.cryptographyService.compare(dto.password, dummyHash);

    if (!userExisting || !passwordMatch) {
      this.securityLogger.logFailedLogin(
        dto.email,
        ip || 'unknown',
        userAgent,
        'Credenciais inválidas',
      );
      // Sempre retornar a mesma mensagem, não revelando se email existe
      throw new LoginException('login ou senha inválidos!');
    }

    const accessToken = this.generateToken(userExisting);
    const refreshToken = this.generateRefreshToken(userExisting);

    this.securityLogger.logSuccessfulLogin(
      userExisting.id,
      userExisting.email,
      ip || 'unknown',
      userAgent,
    );

    return { accessToken, refreshToken };
  }

  private generateToken(user: User): string {
    const jti = generateId();
    const payload = {
      id: user.id,
      jti,
    };
    const options: JwtSignOptions = {
      expiresIn: this.configService.get('jwt.expires'),
    };

    return this.jwtService.sign(payload, options);
  }

  private generateRefreshToken(user: User): string {
    const jti = generateId();
    const payload = { id: user.id, jti };
    const options: JwtSignOptions = {
      expiresIn: this.configService.get('jwt.refreshExpires'),
      secret: this.configService.get('jwt.refreshSecret'),
    };

    return this.jwtService.sign(payload, options);
  }
}
