import { RolesRepository } from '../repository';
import { FindUserBackofficeAccessUseCase } from './find-user-backoffice-access.use-case';

describe('FindUserBackofficeAccessUseCase', () => {
  let repository: jest.Mocked<
    Pick<RolesRepository, 'findCanAccessBackofficeByUserId'>
  >;
  let useCase: FindUserBackofficeAccessUseCase;

  beforeEach(() => {
    repository = {
      findCanAccessBackofficeByUserId: jest.fn(),
    };

    useCase = new FindUserBackofficeAccessUseCase(
      repository as unknown as RolesRepository,
    );
  });

  it('deve retornar canAccessBackoffice do repositório', async () => {
    repository.findCanAccessBackofficeByUserId.mockResolvedValue(true);

    await expect(useCase.execute('user-1')).resolves.toEqual({
      canAccessBackoffice: true,
    });
    expect(repository.findCanAccessBackofficeByUserId).toHaveBeenCalledWith(
      'user-1',
    );
  });

  it('deve retornar false quando repositório negar acesso', async () => {
    repository.findCanAccessBackofficeByUserId.mockResolvedValue(false);

    await expect(useCase.execute('user-1')).resolves.toEqual({
      canAccessBackoffice: false,
    });
  });
});
