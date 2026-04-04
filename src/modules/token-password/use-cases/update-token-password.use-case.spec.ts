import { TokenPasswordRepository } from '../repository';
import { UpdateTokenPasswordUseCase } from './update-token-password.use-case';

describe('UpdateTokenPasswordUseCase', () => {
  let useCase: UpdateTokenPasswordUseCase;
  let repository: jest.Mocked<Pick<TokenPasswordRepository, 'updateToken'>>;

  beforeEach(() => {
    repository = {
      updateToken: jest.fn().mockResolvedValue(undefined),
    };
    useCase = new UpdateTokenPasswordUseCase(
      repository as unknown as TokenPasswordRepository,
    );
  });

  it('deve marcar tokens do email como usados', async () => {
    await useCase.execute('mail@test.com');

    expect(repository.updateToken).toHaveBeenCalledWith('mail@test.com');
  });
});
