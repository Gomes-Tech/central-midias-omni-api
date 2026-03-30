/**
 *  Anotação: o atual use-case não está utilizando os campos domain e shouldAttachUsersByDomain,
 *  então o teste também não validou esses campos.
 *  Quando a implementação estiver finalizada, devemos repassar esse caso de testes.
 */

import { BadRequestException } from '@common/filters';
import { StorageService } from '@infrastructure/providers';
import { OrganizationRepository } from '../repositories';
import { CreateOrganizationUseCase } from './create-organization.use-case';
import { makeCreateOrganizationDTO, makeOrganization } from './test-helpers';

describe('CreateOrganizationUseCase', () => {
  let useCase: CreateOrganizationUseCase;
  let organizationRepository: jest.Mocked<OrganizationRepository>;
  let storageService: jest.Mocked<StorageService>;

  beforeEach(() => {
    organizationRepository = {
      findBySlug: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<OrganizationRepository>;

    storageService = {
      uploadFile: jest.fn(),
    } as unknown as jest.Mocked<StorageService>;

    useCase = new CreateOrganizationUseCase(
      organizationRepository,
      storageService,
    );
  });

  it('deve impedir criação quando o slug já existir', async () => {
    const dto = makeCreateOrganizationDTO();

    organizationRepository.findBySlug.mockResolvedValue(makeOrganization());

    await expect(useCase.execute(dto, 'requester-id')).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(organizationRepository.create).not.toHaveBeenCalled();
    expect(storageService.uploadFile).not.toHaveBeenCalled();
  });

  it('deve criar organização com avatar e campos opcionais', async () => {
    const dto = makeCreateOrganizationDTO();
    const file = {
      originalname: 'logo.png',
    } as Express.Multer.File;

    organizationRepository.findBySlug.mockResolvedValue(null);
    storageService.uploadFile.mockResolvedValue({
      id: 'file-id',
      path: 'organization/logo.png',
      fullPath: '/tmp/organization/logo.png',
      publicUrl: 'https://cdn.test/organization/logo.png',
    });
    organizationRepository.create.mockResolvedValue();

    await expect(
      useCase.execute(dto, 'requester-id', file),
    ).resolves.toBeUndefined();

    expect(storageService.uploadFile).toHaveBeenCalledWith(file);
    expect(organizationRepository.create).toHaveBeenCalledWith(
      {
        name: dto.name,
        slug: dto.slug,
        avatarUrl: 'https://cdn.test/organization/logo.png',
        isActive: true,
      },
      'requester-id',
    );
  });

  it('deve criar organização sem avatar e ativar por padrão', async () => {
    const dto = makeCreateOrganizationDTO({
      isActive: undefined,
      // shouldAttachUsersByDomain: false,
    });

    organizationRepository.findBySlug.mockResolvedValue(null);
    organizationRepository.create.mockResolvedValue();

    await expect(useCase.execute(dto, 'requester-id')).resolves.toBeUndefined();

    expect(storageService.uploadFile).not.toHaveBeenCalled();
    expect(organizationRepository.create).toHaveBeenCalledWith(
      {
        name: dto.name,
        slug: dto.slug,
        avatarUrl: null,
        isActive: true,
      },
      'requester-id',
    );
  });

  it('deve respeitar isActive false quando esse valor for informado no DTO', async () => {
    const dto = makeCreateOrganizationDTO({
      isActive: false,
    });

    organizationRepository.findBySlug.mockResolvedValue(null);
    organizationRepository.create.mockResolvedValue();

    await expect(useCase.execute(dto, 'requester-id')).resolves.toBeUndefined();

    expect(storageService.uploadFile).not.toHaveBeenCalled();
    expect(organizationRepository.create).toHaveBeenCalledWith(
      {
        name: dto.name,
        slug: dto.slug,
        avatarUrl: null,
        isActive: false,
      },
      'requester-id',
    );
  });

  it('deve propagar erro quando o upload do arquivo falhar', async () => {
    const dto = makeCreateOrganizationDTO();
    const file = {
      originalname: 'logo.png',
    } as Express.Multer.File;
    const error = new Error('Falha no upload');

    organizationRepository.findBySlug.mockResolvedValue(null);
    storageService.uploadFile.mockRejectedValue(error);

    await expect(useCase.execute(dto, 'requester-id', file)).rejects.toThrow(
      'Falha no upload',
    );

    expect(organizationRepository.create).not.toHaveBeenCalled();
  });

  it('deve propagar erro quando a criação no repositório falhar', async () => {
    const dto = makeCreateOrganizationDTO();
    const error = new Error('Falha ao criar organização');

    organizationRepository.findBySlug.mockResolvedValue(null);
    organizationRepository.create.mockRejectedValue(error);

    await expect(useCase.execute(dto, 'requester-id')).rejects.toThrow(
      'Falha ao criar organização',
    );
  });
});
