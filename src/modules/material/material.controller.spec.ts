import { PlatformPermissionGuard } from '@common/guards';
import { Test, TestingModule } from '@nestjs/testing';
import { MaterialController } from './material.controller';
import {
  AcceptMaterialUseCase,
  CreateMaterialUseCase,
  DeleteMaterialFileUseCase,
  DeleteMaterialUseCase,
  EnqueueMaterialAcceptanceExportUseCase,
  FindAllMaterialsUseCase,
  FindMaterialFilesUseCase,
  FindMaterialByIdUseCase,
  ViewMaterialByIdUseCase,
  DownloadMaterialUseCase,
  FindMostAccessedMaterialsUseCase,
  FindMaterialMosaicUseCase,
  SearchMaterialsUseCase,
  UploadMaterialFilesUseCase,
  UpdateMaterialUseCase,
} from './use-cases';
import {
  makeCreateMaterialDTO,
  makeFindAllMaterialsFiltersDTO,
  makeMaterialFile,
  makeMaterialDetails,
  makeMaterialListItem,
  makeSearchMaterialsFiltersDTO,
  makeUploadFile,
  makeUpdateMaterialDTO,
} from './use-cases/test-helpers';

describe('MaterialController', () => {
  let controller: MaterialController;
  let createMaterialUseCase: { execute: jest.Mock };
  let deleteMaterialUseCase: { execute: jest.Mock };
  let findAllMaterialsUseCase: { execute: jest.Mock };
  let searchMaterialsUseCase: { execute: jest.Mock };
  let findMaterialFilesUseCase: { execute: jest.Mock };
  let findMaterialByIdUseCase: { execute: jest.Mock };
  let viewMaterialByIdUseCase: { execute: jest.Mock };
  let downloadMaterialUseCase: { execute: jest.Mock };
  let findMostAccessedMaterialsUseCase: { execute: jest.Mock };
  let findMaterialMosaicUseCase: { execute: jest.Mock };
  let uploadMaterialFilesUseCase: { execute: jest.Mock };
  let updateMaterialUseCase: { execute: jest.Mock };
  let deleteMaterialFileUseCase: { execute: jest.Mock };
  let acceptMaterialUseCase: { execute: jest.Mock };
  let enqueueMaterialAcceptanceExportUseCase: { execute: jest.Mock };

  beforeEach(async () => {
    createMaterialUseCase = { execute: jest.fn() };
    deleteMaterialUseCase = { execute: jest.fn() };
    findAllMaterialsUseCase = { execute: jest.fn() };
    searchMaterialsUseCase = { execute: jest.fn() };
    findMaterialFilesUseCase = { execute: jest.fn() };
    findMaterialByIdUseCase = { execute: jest.fn() };
    viewMaterialByIdUseCase = { execute: jest.fn() };
    downloadMaterialUseCase = { execute: jest.fn() };
    findMostAccessedMaterialsUseCase = { execute: jest.fn() };
    findMaterialMosaicUseCase = { execute: jest.fn() };
    uploadMaterialFilesUseCase = { execute: jest.fn() };
    updateMaterialUseCase = { execute: jest.fn() };
    deleteMaterialFileUseCase = { execute: jest.fn() };
    acceptMaterialUseCase = { execute: jest.fn() };
    enqueueMaterialAcceptanceExportUseCase = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MaterialController],
      providers: [
        { provide: CreateMaterialUseCase, useValue: createMaterialUseCase },
        { provide: DeleteMaterialUseCase, useValue: deleteMaterialUseCase },
        {
          provide: FindAllMaterialsUseCase,
          useValue: findAllMaterialsUseCase,
        },
        {
          provide: SearchMaterialsUseCase,
          useValue: searchMaterialsUseCase,
        },
        {
          provide: FindMaterialByIdUseCase,
          useValue: findMaterialByIdUseCase,
        },
        {
          provide: ViewMaterialByIdUseCase,
          useValue: viewMaterialByIdUseCase,
        },
        {
          provide: DownloadMaterialUseCase,
          useValue: downloadMaterialUseCase,
        },
        {
          provide: FindMostAccessedMaterialsUseCase,
          useValue: findMostAccessedMaterialsUseCase,
        },
        {
          provide: FindMaterialMosaicUseCase,
          useValue: findMaterialMosaicUseCase,
        },
        {
          provide: FindMaterialFilesUseCase,
          useValue: findMaterialFilesUseCase,
        },
        {
          provide: UploadMaterialFilesUseCase,
          useValue: uploadMaterialFilesUseCase,
        },
        {
          provide: DeleteMaterialFileUseCase,
          useValue: deleteMaterialFileUseCase,
        },
        { provide: UpdateMaterialUseCase, useValue: updateMaterialUseCase },
        { provide: AcceptMaterialUseCase, useValue: acceptMaterialUseCase },
        {
          provide: EnqueueMaterialAcceptanceExportUseCase,
          useValue: enqueueMaterialAcceptanceExportUseCase,
        },
      ],
    })
      .overrideGuard(PlatformPermissionGuard)
      .useValue({ canActivate: jest.fn().mockResolvedValue(true) })
      .compile();

    controller = module.get<MaterialController>(MaterialController);
  });

  it('deve delegar findAll sem filtros explícitos', async () => {
    const payload = {
      data: [makeMaterialListItem()],
      total: 1,
      page: 1,
      totalPages: 1,
    };
    findAllMaterialsUseCase.execute.mockResolvedValue(payload);

    const result = await controller.findAll('org-id');

    expect(result).toBe(payload);
    expect(findAllMaterialsUseCase.execute).toHaveBeenCalledWith('org-id', {});
  });

  it('deve delegar findAll com org e filtros', async () => {
    const filters = makeFindAllMaterialsFiltersDTO({ searchTerm: 'inst' });
    const payload = {
      data: [makeMaterialListItem()],
      total: 1,
      page: 1,
      totalPages: 1,
    };
    findAllMaterialsUseCase.execute.mockResolvedValue(payload);

    const result = await controller.findAll('org-id', filters);

    expect(result).toBe(payload);
    expect(findAllMaterialsUseCase.execute).toHaveBeenCalledWith(
      'org-id',
      filters,
    );
  });

  it('deve delegar findMostAccessed', async () => {
    const payload = [
      {
        id: 'material-id',
        name: 'Material popular',
        description: 'Descricao',
        mobileUrl: 'https://cdn.test/mobile.png',
        desktopUrl: 'https://cdn.test/desktop.png',
      },
    ];
    findMostAccessedMaterialsUseCase.execute.mockResolvedValue(payload);

    const result = await controller.findMostAccessed('org-id', 'user-id');

    expect(result).toBe(payload);
    expect(findMostAccessedMaterialsUseCase.execute).toHaveBeenCalledWith(
      'org-id',
      'user-id',
    );
  });

  it('deve delegar findMosaic', async () => {
    const payload = [
      {
        id: 'material-id',
        imageUrl: 'https://cdn.test/image.png',
      },
    ];
    findMaterialMosaicUseCase.execute.mockResolvedValue(payload);

    const result = await controller.findMosaic('org-id', 'user-id');

    expect(result).toBe(payload);
    expect(findMaterialMosaicUseCase.execute).toHaveBeenCalledWith(
      'org-id',
      'user-id',
    );
  });

  it('deve delegar search com org, user e filtros', async () => {
    const filters = makeSearchMaterialsFiltersDTO({ term: 'campanha' });
    const payload = {
      data: [makeMaterialListItem()],
      total: 1,
      page: 1,
      totalPages: 1,
    };
    searchMaterialsUseCase.execute.mockResolvedValue(payload);

    const result = await controller.search('org-id', 'user-id', filters);

    expect(result).toBe(payload);
    expect(searchMaterialsUseCase.execute).toHaveBeenCalledWith(
      'org-id',
      'user-id',
      filters,
    );
  });

  it('deve delegar search com filtros vazios por padrão', async () => {
    const payload = {
      data: [],
      total: 0,
      page: 1,
      totalPages: 0,
    };
    searchMaterialsUseCase.execute.mockResolvedValue(payload);

    const result = await controller.search('org-id', 'user-id');

    expect(result).toBe(payload);
    expect(searchMaterialsUseCase.execute).toHaveBeenCalledWith(
      'org-id',
      'user-id',
      {},
    );
  });

  it('deve delegar downloadMaterial', async () => {
    const files = [{ ...makeMaterialFile(), url: 'https://cdn.test/file.pdf' }];
    downloadMaterialUseCase.execute.mockResolvedValue(files);

    const result = await controller.downloadMaterial(
      'material-id',
      'org-id',
      'user-id',
    );

    expect(result).toBe(files);
    expect(downloadMaterialUseCase.execute).toHaveBeenCalledWith(
      'material-id',
      'org-id',
      'user-id',
    );
  });

  it('deve delegar findDetailsById', async () => {
    const material = makeMaterialDetails();
    viewMaterialByIdUseCase.execute.mockResolvedValue(material);

    const result = await controller.findDetailsById(
      material.id,
      'org-id',
      'user-id',
    );

    expect(result).toBe(material);
    expect(viewMaterialByIdUseCase.execute).toHaveBeenCalledWith(
      material.id,
      'org-id',
      'user-id',
    );
  });

  it('deve delegar findById', async () => {
    const material = makeMaterialDetails();
    findMaterialByIdUseCase.execute.mockResolvedValue(material);

    await controller.findById(material.id, 'org-id', 'user-id');

    expect(findMaterialByIdUseCase.execute).toHaveBeenCalledWith(
      material.id,
      'org-id',
      'user-id',
    );
  });

  it('deve delegar acceptMaterial', async () => {
    const payload = { acceptedAt: new Date('2024-02-01T00:00:00.000Z') };
    acceptMaterialUseCase.execute.mockResolvedValue(payload);

    const result = await controller.acceptMaterial(
      'material-id',
      { accepted: true },
      'org-id',
      'user-id',
    );

    expect(result).toBe(payload);
    expect(acceptMaterialUseCase.execute).toHaveBeenCalledWith(
      'material-id',
      'org-id',
      'user-id',
      { accepted: true },
    );
  });

  it('deve delegar exportAcceptanceReport para enfileiramento', async () => {
    enqueueMaterialAcceptanceExportUseCase.execute.mockResolvedValue({
      enqueued: true,
    });

    const result = await controller.exportAcceptanceReport(
      'material-id',
      'org-id',
      'user-id',
    );

    expect(enqueueMaterialAcceptanceExportUseCase.execute).toHaveBeenCalledWith(
      'material-id',
      'org-id',
      'user-id',
    );
    expect(result).toEqual({
      message:
        'Relatório enfileirado. Você receberá o CSV por e-mail em breve.',
    });
  });

  it('deve delegar findFiles', async () => {
    const files = [{ ...makeMaterialFile(), url: 'https://cdn.test/file.pdf' }];
    findMaterialFilesUseCase.execute.mockResolvedValue(files);

    const result = await controller.findFiles('material-id', 'org-id');

    expect(result).toBe(files);
    expect(findMaterialFilesUseCase.execute).toHaveBeenCalledWith(
      'material-id',
      'org-id',
    );
  });

  it('deve delegar create sem arquivos', async () => {
    const dto = makeCreateMaterialDTO();
    createMaterialUseCase.execute.mockResolvedValue(undefined);

    await controller.create(dto, 'org-id', 'user-id', undefined);

    expect(createMaterialUseCase.execute).toHaveBeenCalledWith(
      'org-id',
      dto,
      'user-id',
      [],
    );
  });

  it('deve delegar create', async () => {
    const dto = makeCreateMaterialDTO();
    const file = makeUploadFile();
    createMaterialUseCase.execute.mockResolvedValue(undefined);

    await controller.create(dto, 'org-id', 'user-id', [file]);

    expect(createMaterialUseCase.execute).toHaveBeenCalledWith(
      'org-id',
      dto,
      'user-id',
      [file],
    );
  });

  it('deve delegar uploadFiles com array de arquivos', async () => {
    const file = makeUploadFile();
    const payload = [makeMaterialFile()];
    uploadMaterialFilesUseCase.execute.mockResolvedValue(payload);

    const result = await controller.uploadFiles(
      'material-id',
      'org-id',
      [file],
      'user-id',
    );

    expect(result).toBe(payload);
    expect(uploadMaterialFilesUseCase.execute).toHaveBeenCalledWith(
      'material-id',
      'org-id',
      [file],
      'user-id',
    );
  });

  it('deve delegar uploadFiles normalizando objeto de arquivos', async () => {
    const file = makeUploadFile();
    uploadMaterialFilesUseCase.execute.mockResolvedValue([makeMaterialFile()]);

    await controller.uploadFiles(
      'material-id',
      'org-id',
      { files: [file] },
      'user-id',
    );

    expect(uploadMaterialFilesUseCase.execute).toHaveBeenCalledWith(
      'material-id',
      'org-id',
      [file],
      'user-id',
    );
  });

  it('deve delegar uploadFiles quando arquivo vier como valor único no objeto', async () => {
    const file = makeUploadFile();
    uploadMaterialFilesUseCase.execute.mockResolvedValue([makeMaterialFile()]);

    await controller.uploadFiles(
      'material-id',
      'org-id',
      { file },
      'user-id',
    );

    expect(uploadMaterialFilesUseCase.execute).toHaveBeenCalledWith(
      'material-id',
      'org-id',
      [file],
      'user-id',
    );
  });

  it('deve delegar update', async () => {
    const dto = makeUpdateMaterialDTO({ name: 'Novo nome' });
    updateMaterialUseCase.execute.mockResolvedValue(undefined);

    await controller.update('material-id', dto, 'org-id', 'user-id');

    expect(updateMaterialUseCase.execute).toHaveBeenCalledWith(
      'material-id',
      'org-id',
      dto,
      'user-id',
    );
  });

  it('deve delegar delete', async () => {
    deleteMaterialUseCase.execute.mockResolvedValue(undefined);

    await controller.delete('material-id', 'org-id', 'user-id');

    expect(deleteMaterialUseCase.execute).toHaveBeenCalledWith(
      'material-id',
      'org-id',
      'user-id',
    );
  });

  it('deve delegar deleteFile', async () => {
    deleteMaterialFileUseCase.execute.mockResolvedValue(undefined);

    await controller.deleteFile('material-id', 'file-id', 'org-id', 'user-id');

    expect(deleteMaterialFileUseCase.execute).toHaveBeenCalledWith(
      'material-id',
      'file-id',
      'org-id',
      'user-id',
    );
  });
});
