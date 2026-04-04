import { compare, hash } from 'bcrypt';
import { CryptographyService } from './cryptography.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('CryptographyService', () => {
  beforeEach(() => {
    jest.mocked(hash).mockResolvedValue('hashed-value' as never);
    jest.mocked(compare).mockResolvedValue(true as never);
  });

  it('hash deve delegar ao bcrypt com salt 12', async () => {
    const service = new CryptographyService();
    await expect(service.hash('secret')).resolves.toBe('hashed-value');
    expect(hash).toHaveBeenCalledWith('secret', 12);
  });

  it('compare deve delegar ao bcrypt', async () => {
    const service = new CryptographyService();
    await expect(service.compare('a', 'b')).resolves.toBe(true);
    expect(compare).toHaveBeenCalledWith('a', 'b');
  });
});
