import { generateId } from '@common/utils';
import { PrismaService } from '@infrastructure/prisma';
import { Injectable } from '@nestjs/common';
import { CreateTokenDTO } from '../dto';
import { TokenPassword } from '../entities';

@Injectable()
export class TokenPasswordRepository {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Busca o token de reset mais recente para o email, que ainda não foi usado e não expirou.
   * O token no banco é armazenado em hash, então não é possível buscar por token em texto.
   */
  async findLatestValidByEmail(email: string): Promise<TokenPassword | null> {
    const record = await this.prismaService.passwordResetToken.findFirst({
      where: {
        email,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        token: true,
        email: true,
        used: true,
        expiresAt: true,
      },
    });

    if (!record) return null;

    return new TokenPassword(
      record.id,
      record.token,
      record.email,
      record.expiresAt,
      record.used,
    );
  }

  async createToken(dto: CreateTokenDTO): Promise<void> {
    await this.prismaService.passwordResetToken.create({
      data: {
        id: generateId(),
        ...dto,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 5 minutos
      },
    });
  }

  async updateToken(email: string): Promise<void> {
    await this.prismaService.passwordResetToken.updateMany({
      where: {
        email,
      },
      data: {
        used: true,
      },
    });
  }
}
