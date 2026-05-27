import { BadRequestException, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { HoneypotFieldInterceptor } from './honeypot-field.interceptor';

function createContext(request: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

describe('HoneypotFieldInterceptor', () => {
  const interceptor = new HoneypotFieldInterceptor();

  it('deve ignorar quando body não for objeto', async () => {
    const next = { handle: jest.fn(() => of('ok')) };
    const request = { method: 'POST', body: null };

    await expect(
      lastValueFrom(interceptor.intercept(createContext(request), next)),
    ).resolves.toBe('ok');

    expect(next.handle).toHaveBeenCalledTimes(1);
  });

  it('deve ignorar métodos somente leitura', async () => {
    const next = { handle: jest.fn(() => of('ok')) };
    const request = { method: 'GET', body: { userSource: 'bot' } };

    await expect(
      lastValueFrom(interceptor.intercept(createContext(request), next)),
    ).resolves.toBe('ok');

    expect(next.handle).toHaveBeenCalledTimes(1);
  });

  it('deve remover userSource null antes de continuar', async () => {
    const next = { handle: jest.fn(() => of('ok')) };
    const request = { method: 'POST', body: { name: 'Teste', userSource: null } };

    await expect(
      lastValueFrom(interceptor.intercept(createContext(request), next)),
    ).resolves.toBe('ok');

    expect(request.body).toEqual({ name: 'Teste' });
  });

  it('deve remover userSource vazio antes de continuar', async () => {
    const next = { handle: jest.fn(() => of('ok')) };
    const request = { method: 'POST', body: { name: 'Teste', userSource: '' } };

    await expect(
      lastValueFrom(interceptor.intercept(createContext(request), next)),
    ).resolves.toBe('ok');

    expect(request.body).toEqual({ name: 'Teste' });
    expect(next.handle).toHaveBeenCalledTimes(1);
  });

  it('deve aceitar userSource vazio com espaços e removê-lo', async () => {
    const next = { handle: jest.fn(() => of('ok')) };
    const request = {
      method: 'PATCH',
      body: { name: 'Teste', userSource: '   ' },
    };

    await expect(
      lastValueFrom(interceptor.intercept(createContext(request), next)),
    ).resolves.toBe('ok');

    expect(request.body).toEqual({ name: 'Teste' });
  });

  it('deve lançar erro genérico quando userSource vem preenchido', () => {
    const next = { handle: jest.fn(() => of('ok')) };
    const request = {
      method: 'POST',
      body: { name: 'Teste', userSource: 'landing-page' },
    };

    expect(() => interceptor.intercept(createContext(request), next)).toThrow(
      BadRequestException,
    );
    expect(next.handle).not.toHaveBeenCalled();
  });

  it('deve lançar erro genérico quando userSource vem com tipo inesperado', () => {
    const next = { handle: jest.fn(() => of('ok')) };
    const request = { method: 'PUT', body: { userSource: 1 } };

    expect(() => interceptor.intercept(createContext(request), next)).toThrow(
      BadRequestException,
    );
    expect(next.handle).not.toHaveBeenCalled();
  });
});
