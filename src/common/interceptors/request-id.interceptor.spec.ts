import { ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of, throwError } from 'rxjs';
import { Response } from 'express';
import {
  REQUEST_ID_HEADER,
  REQUEST_ID_KEY,
  RequestIdInterceptor,
} from './request-id.interceptor';

function createContext(
  request: Record<string, unknown>,
  response: Pick<Response, 'setHeader'>,
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ExecutionContext;
}

describe('RequestIdInterceptor', () => {
  const interceptor = new RequestIdInterceptor();

  const uuidV4 =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  it('deve gerar UUID quando header estiver ausente', async () => {
    const request: Record<string, unknown> = { headers: {} };
    const setHeader = jest.fn();
    const next = { handle: () => of('done') };

    await lastValueFrom(
      interceptor.intercept(
        createContext(request, { setHeader }),
        next,
      ),
    );

    const rid = request[REQUEST_ID_KEY] as string;
    expect(rid).toMatch(uuidV4);
    expect(setHeader).toHaveBeenCalledWith(REQUEST_ID_HEADER, rid);
  });

  it('deve reutilizar x-request-id do cliente', async () => {
    const request: Record<string, unknown> = {
      headers: { [REQUEST_ID_HEADER]: 'client-rid' },
    };
    const setHeader = jest.fn();
    const next = { handle: () => of(1) };

    await lastValueFrom(
      interceptor.intercept(
        createContext(request, { setHeader }),
        next,
      ),
    );

    expect(request[REQUEST_ID_KEY]).toBe('client-rid');
    expect(setHeader).toHaveBeenCalledWith(REQUEST_ID_HEADER, 'client-rid');
  });

  it('deve executar tap em sucesso e em erro sem alterar request id', async () => {
    const request: Record<string, unknown> = { headers: {} };
    const setHeader = jest.fn();

    await expect(
      lastValueFrom(
        interceptor.intercept(
          createContext(request, { setHeader }),
          { handle: () => throwError(() => new Error('fail')) },
        ),
      ),
    ).rejects.toThrow('fail');

    expect(request[REQUEST_ID_KEY]).toEqual(expect.any(String));

    await lastValueFrom(
      interceptor.intercept(
        createContext({ headers: {} }, { setHeader: jest.fn() }),
        { handle: () => of('ok') },
      ),
    );
  });
});
