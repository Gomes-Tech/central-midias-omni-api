import { BadRequestException, NotFoundException } from '@common/filters';
import { LoggerService } from '@infrastructure/log';
import { PrismaService } from '@infrastructure/prisma';
import {
  PRINT_PREFLIGHT_JOB,
  PRINT_PREFLIGHT_QUEUE,
} from '@infrastructure/queue';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { SavePrintPresetDTO } from '../dto';

const presetInclude = {
  colorProfile: {
    select: {
      id: true,
      name: true,
      checksum: true,
      outputConditionIdentifier: true,
      isActive: true,
    },
  },
  _count: {
    select: { templates: true },
  },
} as const;

@Injectable()
export class PrintPresetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    @InjectQueue(PRINT_PREFLIGHT_QUEUE)
    private readonly preflightQueue: Queue<{ presetId: string }>,
  ) {}

  async list(organizationId: string) {
    const presets = await this.prisma.printPreset.findMany({
      where: { organizationId },
      include: presetInclude,
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });
    return presets.map((preset) => this.serialize(preset));
  }

  async listAvailableColorProfiles() {
    return this.prisma.printColorProfile.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
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

  async get(id: string, organizationId: string) {
    const preset = await this.findOrThrow(id, organizationId);
    return this.serialize(preset);
  }

  async create(
    organizationId: string,
    dto: SavePrintPresetDTO,
    userId: string,
  ) {
    await this.assertProfile(dto.colorProfileId);
    this.assertGeometry(dto);
    const preset = await this.prisma.printPreset.create({
      data: { ...dto, name: dto.name.trim(), organizationId },
      include: presetInclude,
    });
    void this.logger.info('Preset de impressão criado', {
      presetId: preset.id,
      organizationId,
      userId,
    });
    return this.serialize(preset);
  }

  async update(
    id: string,
    organizationId: string,
    dto: SavePrintPresetDTO,
    userId: string,
  ) {
    await this.findOrThrow(id, organizationId);
    await this.assertProfile(dto.colorProfileId);
    this.assertGeometry(dto);
    const preset = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.printPreset.update({
        where: { id },
        data: { ...dto, name: dto.name.trim() },
        include: presetInclude,
      });
      const templates = await tx.materialTemplate.findMany({
        where: { printPresetId: id },
        select: { id: true },
      });
      if (templates.length) {
        await tx.printPreflight.updateMany({
          where: { templateId: { in: templates.map((item) => item.id) } },
          data: { status: 'PENDING', issues: [], checkedAt: null },
        });
      }
      return updated;
    });

    await this.preflightQueue.add(
      PRINT_PREFLIGHT_JOB,
      { presetId: id },
      { jobId: `${id}-${preset.updatedAt.getTime()}` },
    );
    void this.logger.info('Preset de impressão atualizado', {
      presetId: id,
      organizationId,
      userId,
    });
    return this.serialize(preset);
  }

  async archive(id: string, organizationId: string, userId: string) {
    await this.findOrThrow(id, organizationId);
    const linked = await this.prisma.materialTemplate.count({
      where: { printPresetId: id, status: 'PUBLISHED' },
    });
    if (linked) {
      throw new BadRequestException(
        'O preset está vinculado a templates publicados',
      );
    }
    await this.prisma.printPreset.update({
      where: { id },
      data: { isActive: false },
    });
    void this.logger.info('Preset de impressão arquivado', {
      presetId: id,
      organizationId,
      userId,
    });
    return { archived: true };
  }

  async remove(id: string, organizationId: string, userId: string) {
    await this.findOrThrow(id, organizationId);
    const unlinkedTemplateCount = await this.prisma.$transaction(async (tx) => {
      const templates = await tx.materialTemplate.findMany({
        where: { printPresetId: id },
        select: { id: true },
      });
      if (templates.length) {
        await tx.printPreflight.deleteMany({
          where: { templateId: { in: templates.map((item) => item.id) } },
        });
        await tx.materialTemplate.updateMany({
          where: { printPresetId: id },
          data: { printPresetId: null },
        });
      }
      await tx.printPreset.delete({ where: { id } });
      return templates.length;
    });
    void this.logger.info('Preset de impressão removido', {
      presetId: id,
      organizationId,
      userId,
      unlinkedTemplateCount,
    });
    return { deleted: true, unlinkedTemplateCount };
  }

  private async findOrThrow(id: string, organizationId: string) {
    const preset = await this.prisma.printPreset.findFirst({
      where: { id, organizationId },
      include: presetInclude,
    });
    if (!preset) throw new NotFoundException('Preset não encontrado');
    return preset;
  }

  private async assertProfile(id: string) {
    const profile = await this.prisma.printColorProfile.findFirst({
      where: { id, isActive: true },
      select: { id: true },
    });
    if (!profile) throw new BadRequestException('Perfil ICC indisponível');
  }

  private assertGeometry(dto: SavePrintPresetDTO) {
    if (
      dto.safeMarginLeftMm + dto.safeMarginRightMm >= dto.trimWidthMm ||
      dto.safeMarginTopMm + dto.safeMarginBottomMm >= dto.trimHeightMm
    ) {
      throw new BadRequestException(
        'As margens seguras precisam caber na área de corte',
      );
    }
    if (
      dto.includeCropMarks &&
      dto.cropMarkOffsetMm <
        Math.max(
          dto.bleedTopMm,
          dto.bleedRightMm,
          dto.bleedBottomMm,
          dto.bleedLeftMm,
        )
    ) {
      throw new BadRequestException(
        'O afastamento das marcas deve ser igual ou maior que a sangria',
      );
    }
  }

  private serialize<T extends Record<string, any>>(preset: T) {
    const { _count, ...rest } = preset;
    const decimalKeys = [
      'trimWidthMm',
      'trimHeightMm',
      'bleedTopMm',
      'bleedRightMm',
      'bleedBottomMm',
      'bleedLeftMm',
      'safeMarginTopMm',
      'safeMarginRightMm',
      'safeMarginBottomMm',
      'safeMarginLeftMm',
      'cropMarkOffsetMm',
    ];
    return {
      ...Object.fromEntries(
        Object.entries(rest).map(([key, value]) => [
          key,
          decimalKeys.includes(key) ? Number(value) : value,
        ]),
      ),
      linkedTemplateCount: _count?.templates ?? 0,
    };
  }
}
