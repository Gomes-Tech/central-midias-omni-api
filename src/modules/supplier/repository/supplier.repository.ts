import { BadRequestException } from '@common/filters';
import { generateId } from '@common/utils';
import { LoggerService } from '@infrastructure/log';
import { PrismaService } from '@infrastructure/prisma';
import { Injectable } from '@nestjs/common';

@Injectable()
export class SupplierRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  async findDocumentKey(organizationId: string): Promise<string | null> {
    try {
      const document = await this.prisma.supplierDocument.findUnique({
        where: { organizationId },
        select: { fileKey: true },
      });

      return document?.fileKey ?? null;
    } catch (error) {
      this.logger.error('SupplierRepository.findDocumentKey falhou', {
        error: String(error),
        organizationId,
      });
      throw new BadRequestException('Erro ao buscar documento de fornecedores');
    }
  }

  async upsertDocument(
    organizationId: string,
    fileKey: string,
    userId: string,
  ): Promise<void> {
    try {
      await this.prisma.supplierDocument.upsert({
        where: { organizationId },
        create: {
          id: generateId(),
          organizationId,
          fileKey,
        },
        update: { fileKey },
      });

      void this.logger.info('Documento de fornecedores atualizado', {
        organizationId,
        userId,
      });
    } catch (error) {
      this.logger.error('SupplierRepository.upsertDocument falhou', {
        error: String(error),
        organizationId,
        userId,
      });
      throw new BadRequestException(
        'Erro ao atualizar documento de fornecedores',
      );
    }
  }
}
