import { NextFunction, Request, Response } from 'express';
import {
  REQUEST_ID_HEADER,
  REQUEST_ID_KEY,
} from '../interceptors/request-id.interceptor';
import { requestIdMiddleware } from './request-id.middleware';

describe('requestIdMiddleware', () => {
  const next = jest.fn() as NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve usar o X-Request-ID do header quando enviado', () => {
    const req = {
      headers: { [REQUEST_ID_HEADER]: 'client-rid' },
    } as unknown as Request;
    const setHeader = jest.fn();
    const res = { setHeader } as unknown as Response;

    requestIdMiddleware(req, res, next);

    expect((req as unknown as Record<string, unknown>)[REQUEST_ID_KEY]).toBe(
      'client-rid',
    );
    expect(setHeader).toHaveBeenCalledWith(REQUEST_ID_HEADER, 'client-rid');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('deve gerar UUID e definir header quando o cliente não enviar request id', () => {
    const req = { headers: {} } as unknown as Request;
    const setHeader = jest.fn();
    const res = { setHeader } as unknown as Response;

    requestIdMiddleware(req, res, next);

    const rid = (req as unknown as Record<string, unknown>)[REQUEST_ID_KEY] as string;
    expect(rid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(setHeader).toHaveBeenCalledWith(REQUEST_ID_HEADER, rid);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
