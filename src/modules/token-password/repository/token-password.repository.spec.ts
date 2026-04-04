import { PrismaService } from '@infrastructure/prisma';
import { CreateTokenDTO } from '../dto';
import { TokenPasswordRepository } from './token-password.repository';

function createPrismaMock() {
  return {
    passwordResetToken: {
      findFirst: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
  };
}

describe('TokenPasswordRepository', () => {
  let repository: TokenPasswordRepository;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(() => {
    prisma = createPrismaMock();
    repository = new TokenPasswordRepository(
      prisma as unknown as PrismaService,
    );
  });

  describe('findLatestValidByEmail', () => {
    it('deve retornar null quando não houver registro', async () => {
      prisma.passwordResetToken.findFirst.mockResolvedValue(null);

      await expect(
        repository.findLatestValidByEmail('a@b.com'),
      ).resolves.toBeNull();
    });

    it('deve mapear registro para TokenPassword', async () => {
      const expiresAt = new Date('2030-06-01T12:00:00.000Z');
      prisma.passwordResetToken.findFirst.mockResolvedValue({
        id: 'id-1',
        token: 'hash',
        email: 'a@b.com',
        used: false,
        expiresAt,
      });

      const result = await repository.findLatestValidByEmail('a@b.com');

      expect(result).toMatchObject({
        id: 'id-1',
        token: 'hash',
        email: 'a@b.com',
        used: false,
        expiresAt,
      });
      expect(prisma.passwordResetToken.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            email: 'a@b.com',
            used: false,
            expiresAt: { gt: expect.any(Date) },
          },
          orderBy: { createdAt: 'desc' },
        }),
      );
    });
  });

  describe('createToken', () => {
    it('deve criar registro com expiração em ~15 minutos', async () => {
      prisma.passwordResetToken.create.mockResolvedValue({} as never);
      const before = Date.now();

      const dto: CreateTokenDTO = { email: 'x@y.com', token: 'hashed' };
      await repository.createToken(dto);

      expect(prisma.passwordResetToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'x@y.com',
          token: 'hashed',
          id: expect.any(String),
          expiresAt: expect.any(Date),
        }),
      });

      const call = prisma.passwordResetToken.create.mock.calls[0][0];
      const exp = call.data.expiresAt as Date;
      const delta = exp.getTime() - before;
      expect(delta).toBeGreaterThanOrEqual(15 * 60 * 1000 - 1000);
      expect(delta).toBeLessThanOrEqual(15 * 60 * 1000 + 2000);
    });
  });

  describe('updateToken', () => {
    it('deve marcar todos os tokens do email como usados', async () => {
      prisma.passwordResetToken.updateMany.mockResolvedValue({ count: 2 });

      await repository.updateToken('u@test.com');

      expect(prisma.passwordResetToken.updateMany).toHaveBeenCalledWith({
        where: { email: 'u@test.com' },
        data: { used: true },
      });
    });
  });
});
