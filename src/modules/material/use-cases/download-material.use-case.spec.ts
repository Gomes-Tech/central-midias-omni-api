import { ForbiddenException, NotFoundException } from '@common/filters';
import { StorageService } from '@infrastructure/providers';
import { MaterialRepository } from '../repository';
import { FindMaterialByIdUseCase } from './find-material-by-id.use-case';
import { DownloadMaterialUseCase } from './download-material.use-case';
import { makeMaterialDetails, makeMaterialFile } from './test-helpers';

describe('DownloadMaterialUseCase', () => {
  let findMaterialByIdUseCase: jest.Mocked<Pick<FindMaterialByIdUseCase, 'execute'>>;
  let materialRepository: jest.Mocked<
    Pick<
      MaterialRepository,
      'userHasCategoryAccess' | 'findFilesByMaterialId' | 'registerDownload'
    >
  >;
  let storageService: jest.Mocked<Pick<StorageService, 'getDownloadUrl'>>;
  let useCase: DownloadMaterialUseCase;

  beforeEach(() => {
    findMaterialByIdUseCase = {
      execute: jest.fn(),
    };
    materialRepository = {
      userHasCategoryAccess: jest.fn(),
      findFilesByMaterialId: jest.fn(),
      registerDownload: jest.fn(),
    };
    storageService = {
      getDownloadUrl: jest.fn(),
    };

    useCase = new DownloadMaterialUseCase(
      findMaterialByIdUseCase as unknown as FindMaterialByIdUseCase,
      materialRepository as unknown as MaterialRepository,
      storageService as unknown as StorageService,
    );
  });

  it('deve registrar um download e retornar URLs de todos os arquivos', async () => {
    const material = makeMaterialDetails();
    const files = [
      makeMaterialFile({ id: 'file-1', fileKey: 'materials/material-id/a.pdf' }),
      makeMaterialFile({ id: 'file-2', fileKey: 'materials/material-id/b.pdf' }),
    ];

    findMaterialByIdUseCase.execute.mockResolvedValue(material);
    materialRepository.userHasCategoryAccess.mockResolvedValue(true);
    materialRepository.findFilesByMaterialId.mockResolvedValue(files);
    materialRepository.registerDownload.mockResolvedValue(undefined);
    storageService.getDownloadUrl
      .mockResolvedValueOnce('https://cdn.test/a.pdf')
      .mockResolvedValueOnce('https://cdn.test/b.pdf');

    await expect(
      useCase.execute(material.id, 'org-id', 'user-id'),
    ).resolves.toEqual([
      {
        id: 'file-1',
        materialId: 'material-id',
        mimeType: 'application/pdf',
        size: 1024,
        url: 'https://cdn.test/a.pdf',
      },
      {
        id: 'file-2',
        materialId: 'material-id',
        mimeType: 'application/pdf',
        size: 1024,
        url: 'https://cdn.test/b.pdf',
      },
    ]);

    expect(materialRepository.registerDownload).toHaveBeenCalledTimes(1);
    expect(materialRepository.registerDownload).toHaveBeenCalledWith(
      material.id,
      'user-id',
    );
    expect(storageService.getDownloadUrl).toHaveBeenCalledWith(
      'materials/material-id/a.pdf',
      'a.pdf',
    );
    expect(storageService.getDownloadUrl).toHaveBeenCalledWith(
      'materials/material-id/b.pdf',
      'b.pdf',
    );
  });

  it('deve propagar NotFoundException quando o material não existir', async () => {
    findMaterialByIdUseCase.execute.mockRejectedValue(
      new NotFoundException('Material não encontrado'),
    );

    const result = useCase.execute('missing', 'org-id', 'user-id');

    await expect(result).rejects.toBeInstanceOf(NotFoundException);
    expect(materialRepository.registerDownload).not.toHaveBeenCalled();
  });

  it('deve lançar ForbiddenException sem registrar download quando não houver acesso', async () => {
    const material = makeMaterialDetails();

    findMaterialByIdUseCase.execute.mockResolvedValue(material);
    materialRepository.userHasCategoryAccess.mockResolvedValue(false);

    const result = useCase.execute(material.id, 'org-id', 'user-id');

    await expect(result).rejects.toBeInstanceOf(ForbiddenException);
    await expect(result).rejects.toThrow('Você não possui acesso a este material');
    expect(materialRepository.findFilesByMaterialId).not.toHaveBeenCalled();
    expect(materialRepository.registerDownload).not.toHaveBeenCalled();
  });

  it('deve retornar lista vazia sem registrar download quando material não tiver arquivos', async () => {
    const material = makeMaterialDetails();

    findMaterialByIdUseCase.execute.mockResolvedValue(material);
    materialRepository.userHasCategoryAccess.mockResolvedValue(true);
    materialRepository.findFilesByMaterialId.mockResolvedValue([]);

    await expect(
      useCase.execute(material.id, 'org-id', 'user-id'),
    ).resolves.toEqual([]);

    expect(materialRepository.registerDownload).not.toHaveBeenCalled();
    expect(storageService.getDownloadUrl).not.toHaveBeenCalled();
  });
});
