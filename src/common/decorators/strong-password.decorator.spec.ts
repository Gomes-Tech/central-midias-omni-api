import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { IsStrongPassword } from './strong-password.decorator';

class Account {
  @IsStrongPassword()
  password?: string;
}

describe('strong-password.decorator (IsStrongPassword)', () => {
  it('deve aceitar senha forte', () => {
    const v = plainToInstance(Account, { password: 'Abcd1234' });
    expect(validateSync(v)).toHaveLength(0);
  });

  it('deve ignorar vazio, null e undefined (opcional)', () => {
    expect(
      validateSync(plainToInstance(Account, { password: '' })),
    ).toHaveLength(0);
    expect(
      validateSync(plainToInstance(Account, { password: undefined })),
    ).toHaveLength(0);
    expect(
      validateSync(plainToInstance(Account, { password: null })),
    ).toHaveLength(0);
  });

  it('deve rejeitar senha curta', () => {
    const v = plainToInstance(Account, { password: 'Ab1' });
    expect(validateSync(v).length).toBeGreaterThan(0);
  });

  it('deve rejeitar sem maiúscula', () => {
    const v = plainToInstance(Account, { password: 'abcdef12' });
    expect(validateSync(v).length).toBeGreaterThan(0);
  });

  it('deve rejeitar sem minúscula', () => {
    const v = plainToInstance(Account, { password: 'ABCDEF12' });
    expect(validateSync(v).length).toBeGreaterThan(0);
  });

  it('deve rejeitar sem número', () => {
    const v = plainToInstance(Account, { password: 'Abcdefgh' });
    expect(validateSync(v).length).toBeGreaterThan(0);
  });

  it('deve rejeitar tipo não string', () => {
    const v = plainToInstance(Account, {
      password: 12345678 as unknown as string,
    });
    expect(validateSync(v).length).toBeGreaterThan(0);
  });

  it('defaultMessage deve descrever a regra', () => {
    const v = plainToInstance(Account, { password: 'weak' });
    const [err] = validateSync(v);
    expect(err?.constraints?.isStrongPassword).toContain('mínimo 8 caracteres');
  });
});
