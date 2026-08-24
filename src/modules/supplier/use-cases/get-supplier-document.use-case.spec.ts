import { NotFoundException } from '@common/filters';
import {
  S3_MAX_SIGNED_URL_EXPIRES_IN,
  StorageService,
} from '@infrastructure/providers';
import { FindMemberRoleUseCase } from '@modules/member/use-cases';
import { SupplierRepository } from '../repository';
import { GetSupplierDocumentUseCase } from './get-supplier-document.use-case';

function makeMemberRole(canAccessBackoffice = false) {
  return {
    roleId: 'role-1',
    name: 'EDITOR',
    label: 'Editor',
    canAccessBackoffice,
    permissions: [],
    categoryRoleAccesses: [],
  };
}

describe('GetSupplierDocumentUseCase', () => {
  let supplierRepository: jest.Mocked<
    Pick<SupplierRepository, 'findDocumentKey'>
  >;
  let findMemberRoleUseCase: jest.Mocked<Pick<FindMemberRoleUseCase, 'execute'>>;
  let storageService: jest.Mocked<Pick<StorageService, 'getPublicUrl'>>;
  let useCase: GetSupplierDocumentUseCase;

  beforeEach(() => {
    supplierRepository = {
      findDocumentKey: jest.fn(),
    };
    findMemberRoleUseCase = {
      execute: jest.fn().mockResolvedValue(makeMemberRole()),
    };
    storageService = {
      getPublicUrl: jest.fn(),
    };

    useCase = new GetSupplierDocumentUseCase(
      supplierRepository as unknown as SupplierRepository,
      findMemberRoleUseCase as unknown as FindMemberRoleUseCase,
      storageService as unknown as StorageService,
    );
  });

  it('deve lançar NotFound quando o usuário não for membro da organização', async () => {
    findMemberRoleUseCase.execute.mockRejectedValue(
      new NotFoundException('Membro não encontrado'),
    );

    await expect(useCase.execute('org-1', 'user-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(supplierRepository.findDocumentKey).not.toHaveBeenCalled();
  });

  it('deve retornar url nula quando a organização não possuir documento', async () => {
    supplierRepository.findDocumentKey.mockResolvedValue(null);

    await expect(useCase.execute('org-1', 'user-1')).resolves.toEqual({
      url: null,
    });
    expect(storageService.getPublicUrl).not.toHaveBeenCalled();
  });

  it('deve retornar a url pública com a maior duração possível', async () => {
    supplierRepository.findDocumentKey.mockResolvedValue('suppliers/lista.pdf');
    storageService.getPublicUrl.mockResolvedValue(
      'https://cdn.test/suppliers/lista.pdf',
    );

    await expect(useCase.execute('org-1', 'user-1')).resolves.toEqual({
      url: 'https://cdn.test/suppliers/lista.pdf',
    });
    expect(storageService.getPublicUrl).toHaveBeenCalledWith(
      'suppliers/lista.pdf',
      S3_MAX_SIGNED_URL_EXPIRES_IN,
    );
  });

  it('deve retornar url nula quando o storage falhar', async () => {
    supplierRepository.findDocumentKey.mockResolvedValue('suppliers/lista.pdf');
    storageService.getPublicUrl.mockRejectedValue(new Error('s3 down'));

    await expect(useCase.execute('org-1', 'user-1')).resolves.toEqual({
      url: null,
    });
  });
});
