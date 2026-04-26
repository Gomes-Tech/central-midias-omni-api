import { BadRequestException } from '@common/filters';
import { StorageService } from '@infrastructure/providers';
import { OrganizationRepository } from '../repositories';
import { FindOrganizationByIdUseCase } from './find-organization-by-id.use-case';
import { UpdateOrganizationUseCase } from './update-organization.use-case';
import { makeOrganization, makeUpdateOrganizationDTO } from './test-helpers';

describe('UpdateOrganizationUseCase', () => {
  let useCase: UpdateOrganizationUseCase;
  let organizationRepository: jest.Mocked<OrganizationRepository>;
  let findOrganizationByIdUseCase: jest.Mocked<FindOrganizationByIdUseCase>;
  let storageService: jest.Mocked<StorageService>;

  beforeEach(() => {
    organizationRepository = {
      findBySlug: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<OrganizationRepository>;

    findOrganizationByIdUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<FindOrganizationByIdUseCase>;

    storageService = {
      uploadFile: jest.fn(),
    } as unknown as jest.Mocked<StorageService>;

    useCase = new UpdateOrganizationUseCase(
      organizationRepository,
      findOrganizationByIdUseCase,
      storageService,
    );
  });

  it('deve impedir atualização com slug duplicado', async () => {
    findOrganizationByIdUseCase.execute.mockResolvedValue({
      ...makeOrganization({ id: 'organization-id', slug: 'organization' }),
      avatarUrl: null,
    });
    organizationRepository.findBySlug.mockResolvedValue(
      makeOrganization({ id: 'another-organization', slug: 'new-slug' }),
    );

    const result = useCase.execute(
      'organization-id',
      makeUpdateOrganizationDTO({ slug: 'new-slug' }),
      'admin-id',
    );

    await expect(result).rejects.toBeInstanceOf(BadRequestException);
    await expect(result).rejects.toThrow(
      'Já existe uma organização com este slug',
    );

    expect(findOrganizationByIdUseCase.execute).toHaveBeenCalledWith(
      'organization-id',
    );
    expect(organizationRepository.update).not.toHaveBeenCalled();
    expect(storageService.uploadFile).not.toHaveBeenCalled();
  });

  it('deve atualizar somente os campos enviados quando o slug não mudar', async () => {
    findOrganizationByIdUseCase.execute.mockResolvedValue({
      ...makeOrganization({ id: 'organization-id', slug: 'organization' }),
      avatarUrl: null,
    });
    organizationRepository.update.mockResolvedValue();

    await expect(
      useCase.execute(
        'organization-id',
        makeUpdateOrganizationDTO({
          name: 'Renamed Organization',
          slug: 'organization',
          isActive: undefined,
        }),
        'admin-id',
      ),
    ).resolves.toBeUndefined();

    expect(findOrganizationByIdUseCase.execute).toHaveBeenCalledWith(
      'organization-id',
    );
    expect(organizationRepository.findBySlug).not.toHaveBeenCalled();
    expect(storageService.uploadFile).not.toHaveBeenCalled();
    expect(organizationRepository.update).toHaveBeenCalledWith(
      'organization-id',
      {
        name: 'Renamed Organization',
        slug: 'organization',
      },
      'admin-id',
    );
  });

  it('deve permitir atualizar slug, status e avatar', async () => {
    const file = {
      originalname: 'logo.png',
    } as Express.Multer.File;

    findOrganizationByIdUseCase.execute.mockResolvedValue({
      ...makeOrganization({ id: 'organization-id', slug: 'organization' }),
      avatarUrl: null,
    });
    organizationRepository.findBySlug.mockResolvedValue(null);
    storageService.uploadFile.mockResolvedValue({
      path: 'organization/logo.png',
    });
    organizationRepository.update.mockResolvedValue();

    await expect(
      useCase.execute(
        'organization-id',
        makeUpdateOrganizationDTO({
          slug: 'new-slug',
          isActive: false,
        }),
        'admin-id',
        file,
      ),
    ).resolves.toBeUndefined();

    expect(findOrganizationByIdUseCase.execute).toHaveBeenCalledWith(
      'organization-id',
    );
    expect(organizationRepository.findBySlug).toHaveBeenCalledWith('new-slug');
    expect(storageService.uploadFile).toHaveBeenCalledWith(file);
    expect(organizationRepository.update).toHaveBeenCalledWith(
      'organization-id',
      {
        name: 'Updated Organization',
        slug: 'new-slug',
        avatarKey: 'organization/logo.png',
        isActive: false,
      },
      'admin-id',
    );
  });

  it('deve permitir atualização quando findBySlug retornar organização com o mesmo id', async () => {
    findOrganizationByIdUseCase.execute.mockResolvedValue({
      ...makeOrganization({ id: 'organization-id', slug: 'organization' }),
      avatarUrl: null,
    });
    organizationRepository.findBySlug.mockResolvedValue(
      makeOrganization({ id: 'organization-id', slug: 'new-slug' }),
    );
    organizationRepository.update.mockResolvedValue();

    await expect(
      useCase.execute(
        'organization-id',
        makeUpdateOrganizationDTO({ slug: 'new-slug' }),
        'admin-id',
      ),
    ).resolves.toBeUndefined();

    expect(findOrganizationByIdUseCase.execute).toHaveBeenCalledWith(
      'organization-id',
    );
    expect(organizationRepository.findBySlug).toHaveBeenCalledWith('new-slug');
    expect(organizationRepository.update).toHaveBeenCalledWith(
      'organization-id',
      {
        name: 'Updated Organization',
        slug: 'new-slug',
        isActive: false,
      },
      'admin-id',
    );
  });

  it('deve propagar erro quando findOrganizationByIdUseCase.execute falhar', async () => {
    const error = new Error('Erro ao buscar organização atual');

    findOrganizationByIdUseCase.execute.mockRejectedValue(error);

    await expect(
      useCase.execute(
        'organization-id',
        makeUpdateOrganizationDTO(),
        'admin-id',
      ),
    ).rejects.toBe(error);
  });

  it('deve propagar erro quando organizationRepository.findBySlug falhar', async () => {
    const error = new Error('Erro ao buscar slug');

    findOrganizationByIdUseCase.execute.mockResolvedValue({
      ...makeOrganization({ id: 'organization-id', slug: 'organization' }),
      avatarUrl: null,
    });
    organizationRepository.findBySlug.mockRejectedValue(error);

    await expect(
      useCase.execute(
        'organization-id',
        makeUpdateOrganizationDTO({ slug: 'new-slug' }),
        'admin-id',
      ),
    ).rejects.toBe(error);
  });

  it('deve propagar erro quando storageService.uploadFile falhar', async () => {
    const file = {
      originalname: 'logo.png',
    } as Express.Multer.File;
    const error = new Error('Erro no upload');

    findOrganizationByIdUseCase.execute.mockResolvedValue({
      ...makeOrganization({ id: 'organization-id', slug: 'organization' }),
      avatarUrl: null,
    });
    organizationRepository.findBySlug.mockResolvedValue(null);
    storageService.uploadFile.mockRejectedValue(error);

    await expect(
      useCase.execute(
        'organization-id',
        makeUpdateOrganizationDTO({ slug: 'new-slug' }),
        'admin-id',
        file,
      ),
    ).rejects.toBe(error);

    expect(organizationRepository.update).not.toHaveBeenCalled();
  });

  it('deve propagar erro quando organizationRepository.update falhar', async () => {
    const error = new Error('Erro ao atualizar organização');

    findOrganizationByIdUseCase.execute.mockResolvedValue({
      ...makeOrganization({ id: 'organization-id', slug: 'organization' }),
      avatarUrl: null,
    });
    organizationRepository.findBySlug.mockResolvedValue(null);
    organizationRepository.update.mockRejectedValue(error);

    await expect(
      useCase.execute(
        'organization-id',
        makeUpdateOrganizationDTO({ slug: 'new-slug' }),
        'admin-id',
      ),
    ).rejects.toBe(error);
  });
});
