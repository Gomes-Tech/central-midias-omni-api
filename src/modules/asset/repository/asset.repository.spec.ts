import { LoggerService } from '@infrastructure/log';
import { PrismaService } from '@infrastructure/prisma';
import { AssetRepository } from './asset.repository';

describe('AssetRepository template dependencies', () => {
  it('despublica dependentes e remove o asset na mesma transação', async () => {
    const tx = {
      materialTemplateAsset: {
        findMany: jest.fn().mockResolvedValue([{ templateId: 'template-id' }]),
      },
      materialTemplate: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      asset: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
    };
    const prisma = {
      $transaction: jest.fn(
        async (callback: (client: typeof tx) => Promise<unknown>) =>
          callback(tx),
      ),
    };
    const repository = new AssetRepository(
      prisma as unknown as PrismaService,
      { info: jest.fn(), error: jest.fn() } as unknown as LoggerService,
    );

    await repository.delete('asset-id', 'org-id', 'user-id');

    expect(tx.materialTemplate.updateMany).toHaveBeenCalledWith({
      where: {
        id: { in: ['template-id'] },
        organizationId: 'org-id',
      },
      data: {
        status: 'DRAFT',
        publishedAt: null,
        revision: { increment: 1 },
      },
    });
    expect(tx.asset.deleteMany).toHaveBeenCalledWith({
      where: { id: 'asset-id', organizationId: 'org-id' },
    });
  });
});
