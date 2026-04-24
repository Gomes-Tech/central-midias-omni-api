import { BadRequestException } from '@common/filters';
import { LoggerService } from '@infrastructure/log';
import { PrismaService } from '@infrastructure/prisma';
import {
  makeCreateOrganizationDTO,
  makeOrganization,
  makeUpdateOrganizationDTO,
} from '../use-cases/test-helpers';
import { OrganizationRepository } from './organization.repository';

function createPrismaMock() {
  return {
    organization: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };
}

describe('OrganizationRepository', () => {
  let repository: OrganizationRepository;
  let prisma: ReturnType<typeof createPrismaMock>;
  let logger: { error: jest.Mock; info: jest.Mock };

  beforeEach(() => {
    prisma = createPrismaMock();
    logger = { error: jest.fn(), info: jest.fn() };
    repository = new OrganizationRepository(
      prisma as unknown as PrismaService,
      logger as unknown as LoggerService,
    );
  });

  describe('findAll', () => {
    it('deve listar organizações ativas ordenadas por nome', async () => {
      const rows = [
        makeOrganization({ id: '1', name: 'Alpha' }),
        makeOrganization({ id: '2', name: 'Beta' }),
      ];
      prisma.organization.findMany.mockResolvedValue(rows);

      const result = await repository.findAll();

      expect(result).toEqual(rows);
      expect(prisma.organization.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { name: 'asc' },
      });
    });

    it('deve lançar BadRequest quando findMany falhar', async () => {
      prisma.organization.findMany.mockRejectedValue(new Error('db'));

      await expect(repository.findAll()).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(logger.error).toHaveBeenCalledWith(
        'OrganizationRepository.findAll falhou',
        expect.objectContaining({ error: expect.any(String) }),
      );
    });
  });

  describe('findById', () => {
    it('deve retornar null quando não existir', async () => {
      prisma.organization.findUnique.mockResolvedValue(null);

      await expect(repository.findById('missing')).resolves.toBeNull();
      expect(prisma.organization.findUnique).toHaveBeenCalledWith({
        where: { id: 'missing' },
      });
    });

    it('deve retornar a organização quando existir', async () => {
      const org = makeOrganization();
      prisma.organization.findUnique.mockResolvedValue(org);

      await expect(repository.findById(org.id)).resolves.toEqual(org);
    });

    it('deve lançar BadRequest quando findUnique falhar', async () => {
      prisma.organization.findUnique.mockRejectedValue(new Error('db'));

      await expect(repository.findById('x')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('findBySlug', () => {
    it('deve buscar por slug', async () => {
      const org = makeOrganization({ slug: 'acme' });
      prisma.organization.findUnique.mockResolvedValue(org);

      await expect(repository.findBySlug('acme')).resolves.toEqual(org);
      expect(prisma.organization.findUnique).toHaveBeenCalledWith({
        where: { slug: 'acme' },
      });
    });

    it('deve retornar null quando não existir slug', async () => {
      prisma.organization.findUnique.mockResolvedValue(null);

      await expect(repository.findBySlug('unknown')).resolves.toBeNull();
    });

    it('deve lançar BadRequest quando findUnique falhar', async () => {
      prisma.organization.findUnique.mockRejectedValue(new Error('db'));

      await expect(repository.findBySlug('x')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('deve executar transação criando organização, membro e role ADMIN', async () => {
      const txOrgCreate = jest.fn().mockResolvedValue({ id: 'new-org-id' });
      const txRoleFind = jest.fn().mockResolvedValue({ id: 'admin-role-id' });
      const txMemberCreate = jest.fn().mockResolvedValue({});

      prisma.$transaction.mockImplementation(
        async (fn: (tx: unknown) => Promise<unknown>) =>
          fn({
            organization: { create: txOrgCreate },
            role: { findFirstOrThrow: txRoleFind },
            member: { create: txMemberCreate },
          }),
      );

      const dto = makeCreateOrganizationDTO();
      await repository.create(
        { ...dto, avatarKey: 'https://cdn.example/avatar.png' },
        'user-1',
      );

      expect(txOrgCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: dto.name,
            slug: dto.slug,
            isActive: true,
            avatarKey: 'https://cdn.example/avatar.png',
            domain: dto.domain,
            shouldAttachUsersByDomain: true,
          }),
          select: { id: true },
        }),
      );
      expect(txRoleFind).toHaveBeenCalledWith({
        where: {
          name: 'ADMIN',
          users: { some: { id: 'user-1' } },
        },
        select: { id: true },
      });
      expect(txMemberCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: 'new-org-id',
            userId: 'user-1',
            roleId: 'admin-role-id',
          }),
        }),
      );
      expect(logger.info).toHaveBeenCalledWith(
        'Organização criada',
        expect.objectContaining({
          organizationId: 'new-org-id',
          userId: 'user-1',
        }),
      );
    });

    it('deve aplicar padrões quando campos opcionais forem omitidos', async () => {
      const txOrgCreate = jest.fn().mockResolvedValue({ id: 'o1' });
      const txRoleFind = jest.fn().mockResolvedValue({ id: 'r1' });
      const txMemberCreate = jest.fn().mockResolvedValue({});

      prisma.$transaction.mockImplementation(
        async (fn: (tx: unknown) => Promise<unknown>) =>
          fn({
            organization: { create: txOrgCreate },
            role: { findFirstOrThrow: txRoleFind },
            member: { create: txMemberCreate },
          }),
      );

      await repository.create(
        { name: 'Só nome', slug: 'so-nome', avatarKey: null },
        'u1',
      );

      expect(txOrgCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isActive: true,
            avatarKey: null,
            domain: null,
            shouldAttachUsersByDomain: false,
          }),
        }),
      );
    });

    it('deve lançar BadRequest quando a transação falhar', async () => {
      prisma.$transaction.mockRejectedValue(new Error('tx'));

      await expect(
        repository.create(
          { ...makeCreateOrganizationDTO(), avatarKey: null },
          'user-1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(logger.error).toHaveBeenCalledWith(
        'OrganizationRepository.create falhou',
        expect.objectContaining({ error: expect.any(String) }),
      );
    });
  });

  describe('update', () => {
    it('deve atualizar organização e registrar log', async () => {
      prisma.organization.update.mockResolvedValue(makeOrganization());

      const data = makeUpdateOrganizationDTO();
      await repository.update('org-1', data, 'user-2');

      expect(prisma.organization.update).toHaveBeenCalledWith({
        where: { id: 'org-1' },
        data,
      });
      expect(logger.info).toHaveBeenCalledWith(
        'Organização atualizada',
        expect.objectContaining({
          organizationId: 'org-1',
          userId: 'user-2',
        }),
      );
    });

    it('deve lançar BadRequest quando update falhar', async () => {
      prisma.organization.update.mockRejectedValue(new Error('db'));

      await expect(
        repository.update('x', makeUpdateOrganizationDTO(), 'u'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('deve desativar organização (soft delete)', async () => {
      prisma.organization.update.mockResolvedValue(makeOrganization());

      await repository.delete('org-del');

      expect(prisma.organization.update).toHaveBeenCalledWith({
        where: { id: 'org-del' },
        data: { isActive: false },
      });
    });

    it('deve lançar BadRequest quando soft delete falhar', async () => {
      prisma.organization.update.mockRejectedValue(new Error('db'));

      await expect(repository.delete('x')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
