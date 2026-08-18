import { BadRequestException, ForbiddenException } from '@common/filters';
import { StorageService } from '@infrastructure/providers';
import { FindMemberRoleUseCase } from '@modules/member/use-cases';
import { SupplierRepository } from '../repository';
import { UpsertSupplierDocumentUseCase } from './upsert-supplier-document.use-case';

function makeMemberRole(canAccessBackoffice = true) {
  return {
    roleId: 'role-1',
    name: 'ADMIN',
    label: 'Administrador',
    canAccessBackoffice,
    permissions: [],
    categoryRoleAccesses: [],
  };
}

function makePdfFile(
  overrides: Partial<Express.Multer.File> = {},
): Express.Multer.File {
  return {
    originalname: 'fornecedores.pdf',
    mimetype: 'application/pdf',
    ...overrides,
  } as Express.Multer.File;
}

describe('UpsertSupplierDocumentUseCase', () => {
  let supplierRepository: jest.Mocked<
    Pick<SupplierRepository, 'findDocumentKey' | 'upsertDocument'>
  >;
  let findMemberRoleUseCase: jest.Mocked<Pick<FindMemberRoleUseCase, 'execute'>>;
  let storageService: jest.Mocked<
    Pick<StorageService, 'uploadFile' | 'deleteFile'>
  >;
  let useCase: UpsertSupplierDocumentUseCase;

  beforeEach(() => {
    supplierRepository = {
      findDocumentKey: jest.fn().mockResolvedValue(null),
      upsertDocument: jest.fn().mockResolvedValue(undefined),
    };
    findMemberRoleUseCase = {
      execute: jest.fn().mockResolvedValue(makeMemberRole()),
    };
    storageService = {
      uploadFile: jest.fn().mockResolvedValue({ path: 'suppliers/lista.pdf' }),
      deleteFile: jest.fn().mockResolvedValue(undefined),
    };

    useCase = new UpsertSupplierDocumentUseCase(
      supplierRepository as unknown as SupplierRepository,
      findMemberRoleUseCase as unknown as FindMemberRoleUseCase,
      storageService as unknown as StorageService,
    );
  });

  it('deve lançar Forbidden quando o usuário não tiver canAccessBackoffice', async () => {
    findMemberRoleUseCase.execute.mockResolvedValue(
      makeMemberRole(false),
    );

    await expect(
      useCase.execute('org-1', 'user-1', makePdfFile()),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(storageService.uploadFile).not.toHaveBeenCalled();
  });

  it('deve lançar BadRequest quando o arquivo não for enviado', async () => {
    await expect(useCase.execute('org-1', 'user-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(storageService.uploadFile).not.toHaveBeenCalled();
  });

  it('deve lançar BadRequest quando o arquivo não for PDF', async () => {
    await expect(
      useCase.execute(
        'org-1',
        'user-1',
        makePdfFile({ originalname: 'lista.png', mimetype: 'image/png' }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(storageService.uploadFile).not.toHaveBeenCalled();
  });

  it('deve fazer upload e salvar a key quando a organização não possuir documento', async () => {
    const file = makePdfFile();

    await expect(
      useCase.execute('org-1', 'user-1', file),
    ).resolves.toBeUndefined();

    expect(storageService.uploadFile).toHaveBeenCalledWith(file, 'suppliers');
    expect(supplierRepository.upsertDocument).toHaveBeenCalledWith(
      'org-1',
      'suppliers/lista.pdf',
      'user-1',
    );
    expect(storageService.deleteFile).not.toHaveBeenCalled();
  });

  it('deve aceitar PDF com mime octet-stream', async () => {
    const file = makePdfFile({ mimetype: 'application/octet-stream' });

    await expect(
      useCase.execute('org-1', 'user-1', file),
    ).resolves.toBeUndefined();

    expect(storageService.uploadFile).toHaveBeenCalledWith(file, 'suppliers');
  });

  it('deve substituir o documento anterior e remover o arquivo antigo', async () => {
    supplierRepository.findDocumentKey.mockResolvedValue(
      'suppliers/antigo.pdf',
    );

    await expect(
      useCase.execute('org-1', 'user-1', makePdfFile()),
    ).resolves.toBeUndefined();

    expect(supplierRepository.upsertDocument).toHaveBeenCalledWith(
      'org-1',
      'suppliers/lista.pdf',
      'user-1',
    );
    expect(storageService.deleteFile).toHaveBeenCalledWith([
      'suppliers/antigo.pdf',
    ]);
  });

  it('não deve remover o arquivo anterior quando o upload falhar', async () => {
    storageService.uploadFile.mockRejectedValue(new Error('upload failed'));

    await expect(
      useCase.execute('org-1', 'user-1', makePdfFile()),
    ).rejects.toThrow('upload failed');
    expect(supplierRepository.upsertDocument).not.toHaveBeenCalled();
    expect(storageService.deleteFile).not.toHaveBeenCalled();
  });
});
