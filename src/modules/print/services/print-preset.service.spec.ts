import { LoggerService } from '@infrastructure/log';
import { PrismaService } from '@infrastructure/prisma';
import type { SavePrintPresetDTO } from '../dto';
import { PrintPresetService } from './print-preset.service';

const input: SavePrintPresetDTO = {
  name: 'A4 gráfica',
  colorProfileId: 'profile-id',
  trimWidthMm: 210,
  trimHeightMm: 297,
  bleedTopMm: 3,
  bleedRightMm: 3,
  bleedBottomMm: 3,
  bleedLeftMm: 3,
  safeMarginTopMm: 5,
  safeMarginRightMm: 5,
  safeMarginBottomMm: 5,
  safeMarginLeftMm: 5,
  minimumDpi: 300,
  includeCropMarks: true,
  cropMarkOffsetMm: 3,
  renderingIntent: 'RELATIVE_COLORIMETRIC',
};

describe('PrintPresetService', () => {
  const profile = { id: 'profile-id' };
  const updatedAt = new Date('2026-08-12T12:00:00Z');
  let prisma: any;
  let queue: { add: jest.Mock };
  let service: PrintPresetService;

  beforeEach(() => {
    prisma = {
      printColorProfile: {
        findFirst: jest.fn().mockResolvedValue(profile),
      },
      printPreset: {
        findFirst: jest.fn().mockResolvedValue({ id: 'preset-id' }),
      },
      $transaction: jest.fn(),
    };
    queue = { add: jest.fn() };
    service = new PrintPresetService(
      prisma as PrismaService,
      { info: jest.fn() } as unknown as LoggerService,
      queue as never,
    );
  });

  it('atualiza o registro atual e agenda rechecagem sem criar revisão', async () => {
    const tx = {
      printPreset: {
        update: jest.fn().mockResolvedValue({
          id: 'preset-id',
          organizationId: 'org-id',
          ...input,
          isActive: true,
          createdAt: updatedAt,
          updatedAt,
          colorProfile: profile,
        }),
      },
      materialTemplate: {
        findMany: jest.fn().mockResolvedValue([{ id: 'template-id' }]),
      },
      printPreflight: { updateMany: jest.fn() },
    };
    prisma.$transaction.mockImplementation(async (callback: any) =>
      callback(tx),
    );

    await service.update('preset-id', 'org-id', input, 'user-id');

    expect(tx.printPreset.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'preset-id' },
        data: expect.objectContaining({ name: input.name }),
      }),
    );
    expect(tx.printPreflight.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'PENDING' }),
      }),
    );
    expect(queue.add).toHaveBeenCalledWith(
      'recheck-templates',
      { presetId: 'preset-id' },
      { jobId: `preset-id-${updatedAt.getTime()}` },
    );
  });

  it('rejeita marcas de corte que invadem a sangria', async () => {
    await expect(
      service.create(
        'org-id',
        { ...input, bleedLeftMm: 5, cropMarkOffsetMm: 3 },
        'user-id',
      ),
    ).rejects.toThrow('igual ou maior que a sangria');
  });
});
