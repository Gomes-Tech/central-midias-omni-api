const mockParseMultipart = jest.fn();

jest.mock('multer', () => {
  const memoryStorage = jest.fn();
  const factory = jest.fn(() => ({
    any: jest.fn(() => mockParseMultipart),
  }));
  return Object.assign(factory, { memoryStorage });
});

import type { Request, Response, NextFunction } from 'express';
import {
  isUnlimitedMaterialUpload,
  multipartMiddleware,
} from './multipart.middleware';

describe('multipartMiddleware', () => {
  const next = jest.fn() as NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    mockParseMultipart.mockReset();
  });

  it('deve chamar next sem parsear quando Content-Type não for multipart', () => {
    const req: Partial<Request> = {
      headers: { 'content-type': 'application/json' },
    };
    const res: Partial<Response> = {};

    multipartMiddleware(req as Request, res as Response, next);

    expect(mockParseMultipart).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it('deve chamar next sem parsear quando content-type estiver ausente', () => {
    const req: Partial<Request> = { headers: {} };
    const res: Partial<Response> = {};

    multipartMiddleware(req as Request, res as Response, next);

    expect(mockParseMultipart).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it('deve invocar multer e propagar erro quando o parse falhar', () => {
    const err = new Error('upload falhou');
    mockParseMultipart.mockImplementation(
      (_req: unknown, _res: unknown, cb: (e?: unknown) => void) => {
        cb(err);
      },
    );

    const req: Partial<Request> = {
      headers: { 'content-type': 'multipart/form-data; boundary=----' },
    };
    const res: Partial<Response> = {};

    multipartMiddleware(req as Request, res as Response, next);

    expect(mockParseMultipart).toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(err);
  });

  it('deve definir req.file quando houver exatamente um arquivo', () => {
    const file = { fieldname: 'photo', originalname: 'a.png' };
    mockParseMultipart.mockImplementation(
      (
        req: { files?: unknown; file?: unknown },
        _res: unknown,
        cb: () => void,
      ) => {
        req.files = [file];
        cb();
      },
    );

    const req: Partial<Request> = {
      headers: { 'content-type': 'multipart/form-data; boundary=----' },
    } as any;
    const res: Partial<Response> = {};

    multipartMiddleware(req as Request, res as Response, next);

    expect(req.file).toBe(file);
    expect(next).toHaveBeenCalled();
  });

  it('deve não definir req.file quando não houver arquivos', () => {
    mockParseMultipart.mockImplementation(
      (req: { files?: unknown[] }, _res: unknown, cb: () => void) => {
        req.files = [];
        cb();
      },
    );

    const req: Partial<Request> = {
      headers: { 'content-type': 'multipart/form-data; boundary=----' },
    } as any;
    const res: Partial<Response> = {};

    multipartMiddleware(req as Request, res as Response, next);

    expect(req.file).toBeUndefined();
    expect(next).toHaveBeenCalled();
  });

  it('deve não definir req.file quando houver mais de um arquivo', () => {
    mockParseMultipart.mockImplementation(
      (req: { files?: unknown[] }, _res: unknown, cb: () => void) => {
        req.files = [{}, {}];
        cb();
      },
    );

    const req: Partial<Request> = {
      headers: { 'content-type': 'multipart/form-data; boundary=----' },
    } as any;
    const res: Partial<Response> = {};

    multipartMiddleware(req as Request, res as Response, next);

    expect(req.file).toBeUndefined();
    expect(next).toHaveBeenCalled();
  });
});

describe('isUnlimitedMaterialUpload', () => {
  it('deve liberar POST de criar material', () => {
    expect(
      isUnlimitedMaterialUpload({
        method: 'POST',
        originalUrl: '/api/materials',
        url: '/api/materials',
        path: '/api/materials',
      }),
    ).toBe(true);
  });

  it('deve liberar POST de arquivos do material', () => {
    expect(
      isUnlimitedMaterialUpload({
        method: 'POST',
        originalUrl: '/api/materials/abc-123/files?x=1',
        url: '/api/materials/abc-123/files?x=1',
        path: '/api/materials/abc-123/files',
      }),
    ).toBe(true);
  });

  it('não deve liberar outras rotas multipart', () => {
    expect(
      isUnlimitedMaterialUpload({
        method: 'POST',
        originalUrl: '/api/banners',
        url: '/api/banners',
        path: '/api/banners',
      }),
    ).toBe(false);
    expect(
      isUnlimitedMaterialUpload({
        method: 'GET',
        originalUrl: '/api/materials',
        url: '/api/materials',
        path: '/api/materials',
      }),
    ).toBe(false);
  });
});
