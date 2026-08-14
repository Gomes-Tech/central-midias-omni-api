import { BadRequestException, NotFoundException } from '@common/filters';
import { generateId } from '@common/utils';
import { LoggerService } from '@infrastructure/log';
import { PrismaService } from '@infrastructure/prisma';
import { StorageService } from '@infrastructure/providers';
import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { CreatePrintColorProfileDTO } from '../dto';

const MAX_ICC_SIZE = 5 * 1024 * 1024;

@Injectable()
export class PrintColorProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly logger: LoggerService,
  ) {}

  async list() {
    return this.prisma.printColorProfile.findMany({
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        checksum: true,
        outputConditionIdentifier: true,
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async create(
    dto: CreatePrintColorProfileDTO,
    file: Express.Multer.File,
    userId: string,
  ) {
    this.assertCmykIcc(file);
    const id = generateId();
    const checksum = createHash('sha256').update(file.buffer).digest('hex');
    const storageKey = `print/color-profiles/${id}.icc`;

    const duplicate = await this.prisma.printColorProfile.findFirst({
      where: { OR: [{ name: dto.name.trim() }, { checksum }] },
      select: { id: true },
    });
    if (duplicate) {
      throw new BadRequestException('Nome ou conteúdo ICC já cadastrado');
    }

    await this.storage.writePrivateFile({
      path: storageKey,
      buffer: file.buffer,
      mimeType: 'application/vnd.iccprofile',
    });

    try {
      const profile = await this.prisma.printColorProfile.create({
        data: {
          id,
          name: dto.name.trim(),
          storageKey,
          checksum,
          outputConditionIdentifier: dto.outputConditionIdentifier.trim(),
          description: dto.description?.trim() || null,
        },
      });
      void this.logger.info('Perfil ICC cadastrado', {
        profileId: id,
        checksum,
        userId,
      });
      return this.response(profile);
    } catch (error) {
      await this.storage.deleteFile([storageKey]).catch(() => undefined);
      throw error;
    }
  }

  async setActive(id: string, isActive: boolean, userId: string) {
    const profile = await this.prisma.printColorProfile.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!profile) throw new NotFoundException('Perfil ICC não encontrado');

    if (!isActive) {
      const linked = await this.prisma.printPreset.count({
        where: { colorProfileId: id, isActive: true },
      });
      if (linked) {
        throw new BadRequestException(
          'O perfil está vinculado a presets ativos',
        );
      }
    }

    const updated = await this.prisma.printColorProfile.update({
      where: { id },
      data: { isActive },
    });
    void this.logger.info('Estado do perfil ICC alterado', {
      profileId: id,
      isActive,
      userId,
    });
    return this.response(updated);
  }

  private assertCmykIcc(file: Express.Multer.File) {
    if (
      !file?.buffer?.length ||
      file.buffer.length < 128 ||
      file.buffer.length > MAX_ICC_SIZE
    ) {
      throw new BadRequestException('O perfil ICC deve ter até 5 MB');
    }
    const declaredSize = file.buffer.readUInt32BE(0);
    const signature = file.buffer.subarray(36, 40).toString('ascii');
    const colorSpace = file.buffer.subarray(16, 20).toString('ascii');
    if (
      declaredSize > file.buffer.length ||
      signature !== 'acsp' ||
      colorSpace !== 'CMYK'
    ) {
      throw new BadRequestException('Envie um perfil ICC CMYK válido');
    }
  }

  private response(profile: {
    id: string;
    name: string;
    checksum: string;
    outputConditionIdentifier: string;
    description: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: profile.id,
      name: profile.name,
      checksum: profile.checksum,
      outputConditionIdentifier: profile.outputConditionIdentifier,
      description: profile.description,
      isActive: profile.isActive,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }
}
