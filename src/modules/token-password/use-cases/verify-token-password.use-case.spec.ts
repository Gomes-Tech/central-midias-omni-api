import { BadRequestException } from '@common/filters';
import { CryptographyService } from '@infrastructure/criptography';
import { TokenPasswordRepository } from '../repository';
import { makeTokenPassword } from './test-helpers';
import { VerifyTokenPasswordUseCase } from './verify-token-password.use-case';

describe('VerifyTokenPasswordUseCase', () => {
  let useCase: VerifyTokenPasswordUseCase;
  let repository: jest.Mocked<
    Pick<TokenPasswordRepository, 'findLatestValidByEmail'>
  >;
  let cryptographyService: jest.Mocked<Pick<CryptographyService, 'compare'>>;

  beforeEach(() => {
    repository = {
      findLatestValidByEmail: jest.fn(),
    };

    cryptographyService = {
      compare: jest.fn(),
    };

    useCase = new VerifyTokenPasswordUseCase(
      repository as unknown as TokenPasswordRepository,
      cryptographyService as unknown as CryptographyService,
    );
  });

  it('deve retornar email e expiresAt quando o token for válido', async () => {
    const expiresAt = new Date('2030-01-01T00:00:00.000Z');
    const row = makeTokenPassword({
      email: 'e@test.com',
      token: 'hash-no-banco',
      expiresAt,
    });

    repository.findLatestValidByEmail.mockResolvedValue(row);
    cryptographyService.compare.mockResolvedValue(true);

    await expect(useCase.execute('plain-token', 'e@test.com')).resolves.toEqual(
      {
        email: 'e@test.com',
        expiresAt,
      },
    );

    expect(cryptographyService.compare).toHaveBeenCalledWith(
      'plain-token',
      'hash-no-banco',
    );
  });

  it('deve lançar BadRequest quando não houver token válido', async () => {
    repository.findLatestValidByEmail.mockResolvedValue(null);

    await expect(
      useCase.execute('t', 'missing@test.com'),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(cryptographyService.compare).not.toHaveBeenCalled();
  });

  it('deve lançar BadRequest quando compare falhar', async () => {
    repository.findLatestValidByEmail.mockResolvedValue(
      makeTokenPassword({ token: 'h' }),
    );
    cryptographyService.compare.mockResolvedValue(false);

    await expect(useCase.execute('wrong', 'e@test.com')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
