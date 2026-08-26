import { BadRequestException, NotFoundException } from '@common/filters';
import { generateId } from '@common/utils';
import { LoggerService } from '@infrastructure/log';
import { PrismaService } from '@infrastructure/prisma';
import { StorageService } from '@infrastructure/providers';
import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import {
  CreatePrintColorProfileDTO,
  UpdatePrintColorProfileDTO,
} from '../dto';

const profilePublicSelect = {
  id: true,
  name: true,
  checksum: true,
  outputConditionIdentifier: true,
  description: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

const MAX_ICC_SIZE = 5 * 1024 * 1024;

@Injectable()
export class PrintColorProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly logger: LoggerService,
  ) {}

  async list() {
    const profiles = await this.prisma.printColorProfile.findMany({
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      select: {
        ...profilePublicSelect,
        _count: { select: { presets: true } },
      },
    });
    return profiles.map((profile) => this.response(profile));
  }

  async get(id: string) {
    const profile = await this.prisma.printColorProfile.findUnique({
      where: { id },
      select: {
        ...profilePublicSelect,
        _count: { select: { presets: true } },
      },
    });
    if (!profile) throw new NotFoundException('Perfil ICC não encontrado');
    return this.response(profile);
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

  async update(id: string, dto: UpdatePrintColorProfileDTO, userId: string) {
    await this.get(id);
    const name = dto.name.trim();
    const duplicate = await this.prisma.printColorProfile.findFirst({
      where: { name, NOT: { id } },
      select: { id: true },
    });
    if (duplicate) {
      throw new BadRequestException('Nome ou conteúdo ICC já cadastrado');
    }
    const updated = await this.prisma.printColorProfile.update({
      where: { id },
      data: {
        name,
        outputConditionIdentifier: dto.outputConditionIdentifier.trim(),
        description: dto.description?.trim() || null,
      },
      select: {
        ...profilePublicSelect,
        _count: { select: { presets: true } },
      },
    });
    void this.logger.info('Perfil ICC atualizado', {
      profileId: id,
      userId,
    });
    return this.response(updated);
  }

  async remove(id: string, userId: string) {
    const profile = await this.prisma.printColorProfile.findUnique({
      where: { id },
      select: {
        id: true,
        storageKey: true,
        _count: { select: { presets: true } },
      },
    });
    if (!profile) throw new NotFoundException('Perfil ICC não encontrado');
    if (profile._count.presets) {
      throw new BadRequestException(
        'O perfil está vinculado a presets de impressão. Remova os presets antes de excluir o perfil.',
      );
    }

    await this.prisma.printColorProfile.delete({ where: { id } });
    await this.storage.deleteFile([profile.storageKey]).catch(() => undefined);
    void this.logger.info('Perfil ICC removido', {
      profileId: id,
      userId,
    });
    return { deleted: true };
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
    _count?: { presets: number };
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
      linkedPresetCount: profile._count?.presets ?? 0,
    };
  }
}
