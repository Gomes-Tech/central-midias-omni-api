import { LoggerService } from '@infrastructure/log';
import { PrismaService } from '@infrastructure/prisma';
import { InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateRoleDTO } from '../dto';
import { CreateGlobalRoleDTO } from '../dto/create-global-role.dto';
import { makeRole } from '../use-cases/test-helpers';
import { RolesRepository } from './roles.repository';

function createPrismaMock() {
  return {
    role: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    rolePermission: {
      createMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };
}

describe('RolesRepository', () => {
  let repository: RolesRepository;
  let prisma: ReturnType<typeof createPrismaMock>;
  let logger: { error: jest.Mock; info: jest.Mock };

  beforeEach(() => {
    prisma = createPrismaMock();
    logger = { error: jest.fn(), info: jest.fn() };
    repository = new RolesRepository(
      prisma as unknown as PrismaService,
      logger as unknown as LoggerService,
    );
  });

  describe('findAll', () => {
    it('deve listar perfis não deletados ordenados por label', async () => {
      const rows = [makeRole({ id: '1', label: 'A' }), makeRole({ id: '2', label: 'B' })];
      prisma.role.findMany.mockResolvedValue(rows);

      const result = await repository.findAll({});

      expect(result).toEqual(rows);
      expect(prisma.role.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        orderBy: [{ label: 'asc' }],
      });
    });

    it('deve propagar HttpException sem envolver', async () => {
      prisma.role.findMany.mockRejectedValue(new NotFoundException('x'));

      await expect(repository.findAll()).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('deve lançar InternalServerError quando findMany falhar com erro genérico', async () => {
      prisma.role.findMany.mockRejectedValue(new Error('db'));

      await expect(repository.findAll()).rejects.toBeInstanceOf(
        InternalServerErrorException,
      );
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('findAllSelect', () => {
    it('deve listar perfis não deletados retornando apenas id e name', async () => {
      const rows = [
        { id: '1', name: 'ROLE_A' },
        { id: '2', name: 'ROLE_B' },
      ];
      prisma.role.findMany.mockResolvedValue(rows);

      const result = await repository.findAllSelect();

      expect(result).toEqual(rows);
      expect(prisma.role.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        select: {
          id: true,
          name: true,
        },
        orderBy: [{ label: 'asc' }],
      });
    });

    it('deve propagar HttpException sem envolver', async () => {
      prisma.role.findMany.mockRejectedValue(new NotFoundException('x'));

      await expect(repository.findAllSelect()).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('deve lançar InternalServerError quando findMany falhar com erro genérico', async () => {
      prisma.role.findMany.mockRejectedValue(new Error('db'));

      await expect(repository.findAllSelect()).rejects.toBeInstanceOf(
        InternalServerErrorException,
      );
      expect(logger.error).toHaveBeenCalledWith(
        'RolesRepository.findAllSelect falhou',
        expect.objectContaining({ error: expect.any(String) }),
      );
    });
  });

  describe('findById', () => {
    it('deve retornar null quando não existir', async () => {
      prisma.role.findUnique.mockResolvedValue(null);

      await expect(repository.findById('missing')).resolves.toBeNull();
      expect(prisma.role.findUnique).toHaveBeenCalledWith({
        where: { id: 'missing' },
      });
    });

    it('deve retornar o perfil quando existir', async () => {
      const role = makeRole();
      prisma.role.findUnique.mockResolvedValue(role);

      await expect(repository.findById(role.id)).resolves.toEqual(role);
    });

    it('deve lançar InternalServerError quando findUnique falhar com erro genérico', async () => {
      prisma.role.findUnique.mockRejectedValue(new Error('db'));

      await expect(repository.findById('id')).rejects.toBeInstanceOf(
        InternalServerErrorException,
      );
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('findByName', () => {
    it('deve buscar por name com deletedAt null', async () => {
      prisma.role.findFirst.mockResolvedValue(null);

      await repository.findByName('CODE');

      expect(prisma.role.findFirst).toHaveBeenCalledWith({
        where: { name: 'CODE', deletedAt: null },
      });
    });

    it('deve lançar InternalServerError quando findFirst falhar com erro genérico', async () => {
      prisma.role.findFirst.mockRejectedValue(new Error('db'));

      await expect(repository.findByName('X')).rejects.toBeInstanceOf(
        InternalServerErrorException,
      );
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('findByCodes', () => {
    it('deve retornar array vazio quando não houver códigos', async () => {
      await expect(repository.findByCodes([])).resolves.toEqual([]);
      expect(prisma.role.findMany).not.toHaveBeenCalled();
    });

    it('deve deduplicar códigos e filtrar deletedAt', async () => {
      prisma.role.findMany.mockResolvedValue([]);

      await repository.findByCodes(['A', 'A', 'B']);

      expect(prisma.role.findMany).toHaveBeenCalledWith({
        where: {
          name: { in: ['A', 'B'] },
          deletedAt: null,
        },
      });
    });

    it('deve lançar InternalServerError quando findMany falhar com erro genérico', async () => {
      prisma.role.findMany.mockRejectedValue(new Error('db'));

      await expect(repository.findByCodes(['A'])).rejects.toBeInstanceOf(
        InternalServerErrorException,
      );
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('deve criar perfil e retornar id e name', async () => {
      prisma.role.create.mockResolvedValue({
        id: 'new-id',
        name: 'ROLE_X',
      });

      const data: CreateRoleDTO = {
        name: 'ROLE_X',
        label: 'X',
        canHaveSubordinates: false,
        categoryRoleAccesses: [],
      };

      const result = await repository.create(data);

      expect(result).toEqual({ id: 'new-id', name: 'ROLE_X' });
      expect(prisma.role.create).toHaveBeenCalledWith({
        data: {
          label: 'X',
          name: 'ROLE_X',
          canHaveSubordinates: false,
        },
        select: { id: true, name: true },
      });
      expect(logger.info).toHaveBeenCalled();
    });

    it('deve lançar InternalServerError quando create falhar com erro genérico', async () => {
      prisma.role.create.mockRejectedValue(new Error('db'));

      const data: CreateRoleDTO = {
        name: 'R',
        label: 'L',
        canHaveSubordinates: false,
        categoryRoleAccesses: [],
      };

      await expect(repository.create(data)).rejects.toBeInstanceOf(
        InternalServerErrorException,
      );
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('createGlobalRole', () => {
    it('deve executar transação criando role e permissões', async () => {
      const txRoleCreate = jest.fn().mockResolvedValue({ id: 'r-global' });
      const txCreateMany = jest.fn().mockResolvedValue({ count: 1 });

      prisma.$transaction.mockImplementation(
        async (fn: (tx: unknown) => Promise<unknown>) =>
          fn({
            role: { create: txRoleCreate },
            rolePermission: { createMany: txCreateMany },
          }),
      );

      const data: CreateGlobalRoleDTO = {
        name: 'G',
        label: 'Global',
        permissions: [
          { moduleId: 'm1', action: 'READ' },
          { moduleId: 'm2', action: 'UPDATE' },
        ],
      };

      await expect(repository.createGlobalRole(data)).resolves.toBeUndefined();

      expect(txRoleCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            label: 'Global',
            name: 'G',
            canAccessBackoffice: true,
          }),
          select: { id: true },
        }),
      );
      expect(txCreateMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            roleId: 'r-global',
            moduleId: 'm1',
            action: 'READ',
          }),
          expect.objectContaining({
            roleId: 'r-global',
            moduleId: 'm2',
            action: 'UPDATE',
          }),
        ]),
      });
      expect(logger.info).toHaveBeenCalled();
    });

    it('deve lançar BadRequestException e logar erro quando a transação falhar', async () => {
      prisma.$transaction.mockRejectedValue(new Error('tx fail'));

      const data: CreateGlobalRoleDTO = {
        name: 'G',
        label: 'Global',
        permissions: [{ moduleId: 'm1', action: 'READ' }],
      };

      await expect(repository.createGlobalRole(data)).rejects.toThrow(
        'Erro ao criar perfil global',
      );
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('deve aplicar apenas campos definidos', async () => {
      const updated = makeRole({ label: 'Novo' });
      prisma.role.update.mockResolvedValue(updated);

      const result = await repository.update('id-1', {
        label: 'Novo',
        canAccessBackoffice: true,
      });

      expect(result).toEqual(updated);
      expect(prisma.role.update).toHaveBeenCalledWith({
        where: { id: 'id-1' },
        data: {
          label: 'Novo',
          canAccessBackoffice: true,
        },
      });
      expect(logger.info).toHaveBeenCalled();
    });

    it('deve incluir name e canHaveSubordinates quando informados', async () => {
      const updated = makeRole();
      prisma.role.update.mockResolvedValue(updated);

      await repository.update('id-1', {
        name: 'ROLE_X',
        canHaveSubordinates: true,
      });

      expect(prisma.role.update).toHaveBeenCalledWith({
        where: { id: 'id-1' },
        data: {
          name: 'ROLE_X',
          canHaveSubordinates: true,
        },
      });
    });

    it('deve lançar InternalServerError quando update falhar com erro genérico', async () => {
      prisma.role.update.mockRejectedValue(new Error('db'));

      await expect(
        repository.update('id-1', { label: 'x' }),
      ).rejects.toBeInstanceOf(InternalServerErrorException);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('softDelete', () => {
    it('deve definir deletedAt', async () => {
      prisma.role.update.mockResolvedValue({} as never);

      await repository.softDelete('rid');

      expect(prisma.role.update).toHaveBeenCalledWith({
        where: { id: 'rid' },
        data: { deletedAt: expect.any(Date) },
      });
      expect(logger.info).toHaveBeenCalled();
    });

    it('deve lançar InternalServerError quando update falhar com erro genérico', async () => {
      prisma.role.update.mockRejectedValue(new Error('db'));

      await expect(repository.softDelete('rid')).rejects.toBeInstanceOf(
        InternalServerErrorException,
      );
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
