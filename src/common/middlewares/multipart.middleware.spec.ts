const mockParseMultipart = jest.fn();

jest.mock('multer', () => {
  const memoryStorage = jest.fn();
  const factory = jest.fn(() => ({
    any: jest.fn(() => mockParseMultipart),
  }));
  return Object.assign(factory, { memoryStorage });
});

import { NextFunction } from 'express';
import { multipartMiddleware } from './multipart.middleware';

describe('multipartMiddleware', () => {
  const next = jest.fn() as NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    mockParseMultipart.mockReset();
  });

  it('deve chamar next sem parsear quando Content-Type não for multipart', () => {
    const req = {
      headers: { 'content-type': 'application/json' },
    };
    const res = {};

    multipartMiddleware(req, res, next);

    expect(mockParseMultipart).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it('deve chamar next sem parsear quando content-type estiver ausente', () => {
    const req = { headers: {} };
    const res = {};

    multipartMiddleware(req, res, next);

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

    const req = {
      headers: { 'content-type': 'multipart/form-data; boundary=----' },
    };
    const res = {};

    multipartMiddleware(req, res, next);

    expect(mockParseMultipart).toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(err);
  });

  it('deve definir req.file quando houver exatamente um arquivo', () => {
    const file = { fieldname: 'photo', originalname: 'a.png' };
    mockParseMultipart.mockImplementation(
      (req: { files?: unknown; file?: unknown }, _res: unknown, cb: () => void) => {
        req.files = [file];
        cb();
      },
    );

    const req: { headers: Record<string, string>; files?: unknown; file?: unknown } =
      {
        headers: { 'content-type': 'multipart/form-data; boundary=----' },
      };
    const res = {};

    multipartMiddleware(req, res, next);

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

    const req: { headers: Record<string, string>; files?: unknown[]; file?: unknown } =
      {
        headers: { 'content-type': 'multipart/form-data; boundary=----' },
      };
    const res = {};

    multipartMiddleware(req, res, next);

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

    const req: { headers: Record<string, string>; files?: unknown[]; file?: unknown } =
      {
        headers: { 'content-type': 'multipart/form-data; boundary=----' },
      };
    const res = {};

    multipartMiddleware(req, res, next);

    expect(req.file).toBeUndefined();
    expect(next).toHaveBeenCalled();
  });
});
