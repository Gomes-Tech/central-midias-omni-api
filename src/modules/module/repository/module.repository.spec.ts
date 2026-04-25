import { BadRequestException } from '@common/filters';
import { LoggerService } from '@infrastructure/log';
import { PrismaService } from '@infrastructure/prisma';
import {
  makeCreateModuleDTO,
  makeModule,
  makeUpdateModuleDTO,
} from '../use-cases/test-helpers';
import { ModuleRepository } from './module.repository';

function createPrismaMock() {
  return {
    module: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };
}

describe('ModuleRepository', () => {
  let repository: ModuleRepository;
  let prisma: ReturnType<typeof createPrismaMock>;
  let logger: { error: jest.Mock; info: jest.Mock };

  beforeEach(() => {
    prisma = createPrismaMock();
    logger = { error: jest.fn(), info: jest.fn() };
    repository = new ModuleRepository(
      prisma as unknown as PrismaService,
      logger as unknown as LoggerService,
    );
  });

  describe('findAll', () => {
    it('deve listar módulos ordenados por label', async () => {
      const rows = [makeModule({ id: 'm1' }), makeModule({ id: 'm2' })];
      prisma.module.findMany.mockResolvedValue(rows);

      const result = await repository.findAll();

      expect(result).toEqual(rows);
      expect(prisma.module.findMany).toHaveBeenCalledWith({
        orderBy: [{ label: 'asc' }],
      });
    });

    it('deve lançar BadRequest quando findMany falhar', async () => {
      prisma.module.findMany.mockRejectedValue(new Error('db'));

      await expect(repository.findAll()).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('findAllSelect', () => {
    it('deve listar módulos retornando apenas id e name', async () => {
      const rows = [
        { id: 'm1', name: 'roles' },
        { id: 'm2', name: 'users' },
      ];
      prisma.module.findMany.mockResolvedValue(rows);

      const result = await repository.findAllSelect();

      expect(result).toEqual(rows);
      expect(prisma.module.findMany).toHaveBeenCalledWith({
        select: { id: true, name: true },
        orderBy: [{ label: 'asc' }],
      });
    });

    it('deve lançar BadRequest quando findMany falhar', async () => {
      prisma.module.findMany.mockRejectedValue(new Error('db'));

      await expect(repository.findAllSelect()).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(logger.error).toHaveBeenCalledWith(
        'ModuleRepository.findAllSelect falhou',
        expect.objectContaining({ error: expect.any(String) }),
      );
    });
  });

  describe('findById', () => {
    it('deve buscar por id', async () => {
      const row = makeModule({ id: 'm1' });
      prisma.module.findUnique.mockResolvedValue(row);

      await expect(repository.findById('m1')).resolves.toEqual(row);
      expect(prisma.module.findUnique).toHaveBeenCalledWith({
        where: { id: 'm1' },
      });
    });

    it('deve retornar null quando não existir', async () => {
      prisma.module.findUnique.mockResolvedValue(null);

      await expect(repository.findById('missing')).resolves.toBeNull();
    });
  });

  describe('findByName', () => {
    it('deve buscar por name', async () => {
      const row = makeModule({ name: 'roles' });
      prisma.module.findUnique.mockResolvedValue(row);

      await expect(repository.findByName('roles')).resolves.toEqual(row);
      expect(prisma.module.findUnique).toHaveBeenCalledWith({
        where: { name: 'roles' },
      });
    });
  });

  describe('create', () => {
    it('deve criar módulo e registrar log', async () => {
      const created = makeModule({ id: 'm-new' });
      prisma.module.create.mockResolvedValue(created);
      const dto = makeCreateModuleDTO();

      const result = await repository.create(dto);

      expect(result).toEqual(created);
      expect(prisma.module.create).toHaveBeenCalledWith({
        data: { name: dto.name, label: dto.label },
      });
      expect(logger.info).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('deve atualizar apenas campos enviados', async () => {
      const updated = makeModule({ id: 'm1', label: 'Novo' });
      prisma.module.update.mockResolvedValue(updated);
      const dto = makeUpdateModuleDTO({ label: 'Novo' });

      const result = await repository.update('m1', dto);

      expect(result).toEqual(updated);
      expect(prisma.module.update).toHaveBeenCalledWith({
        where: { id: 'm1' },
        data: { label: 'Novo' },
      });
      expect(logger.info).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('deve remover módulo por id', async () => {
      prisma.module.delete.mockResolvedValue(makeModule());

      await repository.delete('m1');

      expect(prisma.module.delete).toHaveBeenCalledWith({
        where: { id: 'm1' },
      });
      expect(logger.info).toHaveBeenCalled();
    });
  });
});
