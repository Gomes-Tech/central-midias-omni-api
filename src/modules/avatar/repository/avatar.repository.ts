import { BadRequestException } from '@common/filters';
import { LoggerService } from '@infrastructure/log';
import { PrismaService } from '@infrastructure/prisma';
import { Injectable } from '@nestjs/common';
import { OrganizationAvatarType } from '../entities';

@Injectable()
export class AvatarRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  async findAvatarKeys(organizationId: string): Promise<{
    standardAvatarKey: string | null;
    customizableAvatarKey: string | null;
  }> {
    try {
      const organization = await this.prisma.organization.findUnique({
        where: { id: organizationId },
        select: {
          standardAvatarKey: true,
          customizableAvatarKey: true,
        },
      });

      return {
        standardAvatarKey: organization?.standardAvatarKey ?? null,
        customizableAvatarKey: organization?.customizableAvatarKey ?? null,
      };
    } catch (error) {
      this.logger.error('AvatarRepository.findAvatarKeys falhou', {
        error: String(error),
        organizationId,
      });
      throw new BadRequestException('Erro ao buscar avatares da organização');
    }
  }

  async findAvatarKey(
    organizationId: string,
    type: OrganizationAvatarType,
  ): Promise<string | null> {
    const keys = await this.findAvatarKeys(organizationId);

    return type === 'standard'
      ? keys.standardAvatarKey
      : keys.customizableAvatarKey;
  }

  async updateAvatarKey(
    organizationId: string,
    type: OrganizationAvatarType,
    fileKey: string,
    userId: string,
  ): Promise<void> {
    try {
      const data =
        type === 'standard'
          ? { standardAvatarKey: fileKey }
          : { customizableAvatarKey: fileKey };

      await this.prisma.organization.update({
        where: { id: organizationId },
        data,
      });

      void this.logger.info('Avatar da organização atualizado', {
        organizationId,
        userId,
        type,
      });
    } catch (error) {
      this.logger.error('AvatarRepository.updateAvatarKey falhou', {
        error: String(error),
        organizationId,
        userId,
        type,
      });
      throw new BadRequestException('Erro ao atualizar avatar da organização');
    }
  }
}
