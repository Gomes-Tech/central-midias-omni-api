import { PrismaService } from '@infrastructure/prisma';
import { LogRepository } from './log.repository';

describe('LogRepository', () => {
  it('create deve delegar ao Prisma log.create', async () => {
    const prisma = {
      log: {
        create: jest.fn().mockResolvedValue({}),
      },
    };
    const repo = new LogRepository(prisma as unknown as PrismaService);

    await repo.create({
      level: 'ERROR',
      message: 'erro',
      requestId: 'req',
      path: '/p',
      method: 'GET',
      userId: 'u1',
      context: { a: 1 },
    });

    expect(prisma.log.create).toHaveBeenCalledWith({
      data: {
        level: 'ERROR',
        message: 'erro',
        context: { a: 1 },
        requestId: 'req',
        path: '/p',
        method: 'GET',
        userId: 'u1',
      },
    });
  });

  it('create deve omitir context e usar null nos metadados opcionais', async () => {
    const prisma = {
      log: {
        create: jest.fn().mockResolvedValue({}),
      },
    };
    const repo = new LogRepository(prisma as unknown as PrismaService);

    await repo.create({
      level: 'ERROR',
      message: 'x',
    });

    expect(prisma.log.create).toHaveBeenCalledWith({
      data: {
        level: 'ERROR',
        message: 'x',
        context: undefined,
        requestId: null,
        path: null,
        method: null,
        userId: null,
      },
    });
  });
});
