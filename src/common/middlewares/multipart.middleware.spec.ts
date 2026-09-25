const mockParseLimitedMultipart = jest.fn();
const mockParseMaterialMultipart = jest.fn();
const mockParsePrintMultipart = jest.fn();
const mockMulterOptionsList: Array<{
  storage?: unknown;
  limits?: { fileSize?: number; files?: number };
}> = [];
let mockDiskStorageOpts:
  | {
      destination: (
        req: unknown,
        file: { originalname: string },
        cb: (err: Error | null, dest: string) => void,
      ) => void;
      filename: (
        req: unknown,
        file: { originalname: string },
        cb: (err: Error | null, name: string) => void,
      ) => void;
    }
  | undefined;

jest.mock('node:fs', () => {
  const actual = jest.requireActual('node:fs');
  return {
    ...actual,
    mkdirSync: jest.fn(),
  };
});

jest.mock('multer', () => {
  const { PRINT_IMAGE_MAX_BYTES: printImageMaxBytes } = jest.requireActual(
    '@common/constants/print-image-limits',
  );
  const memoryStorage = jest.fn(() => 'memory-storage');
  const diskStorage = jest.fn(
    (opts: {
      destination: typeof mockDiskStorageOpts extends infer T
        ? T extends { destination: infer D }
          ? D
          : never
        : never;
      filename: NonNullable<typeof mockDiskStorageOpts>['filename'];
    }) => {
      mockDiskStorageOpts = opts;
      return 'disk-storage';
    },
  );
  const MulterError = class MulterError extends Error {
    code: string;
    constructor(code: string, message?: string) {
      super(message ?? code);
      this.code = code;
      this.name = 'MulterError';
    }
  };
  const factory = jest.fn(
    (opts: {
      storage?: unknown;
      limits?: { fileSize?: number; files?: number };
    }) => {
      mockMulterOptionsList.push(opts);
      const parser =
        opts.limits?.fileSize === printImageMaxBytes
          ? mockParsePrintMultipart
          : opts.limits?.fileSize
            ? mockParseLimitedMultipart
            : mockParseMaterialMultipart;
      return {
        any: jest.fn(() => parser),
      };
    },
  );
  return Object.assign(factory, { memoryStorage, diskStorage, MulterError });
});

import {
  MULTIPART_MAX_FILE_BYTES,
  MULTIPART_MAX_FILES,
} from '@common/constants/multipart-limits';
import {
  PRINT_IMAGE_MAX_BYTES,
  PRINT_IMAGE_MAX_MB,
  PRINT_MULTIPART_MAX_BYTES,
} from '@common/constants/print-image-limits';
import { UnauthorizedException } from '@common/filters';
import { unlinkUploadTemp } from '@infrastructure/providers/storage/upload-body';
import { PayloadTooLargeException } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { MulterError } from 'multer';
import { EventEmitter } from 'node:events';
import { isMaterialUpload, multipartMiddleware } from './multipart.middleware';

jest.mock('@infrastructure/providers/storage/upload-body', () => ({
  unlinkUploadTemp: jest.fn().mockResolvedValue(undefined),
}));

const MULTIPART_HEADERS = {
  'content-type': 'multipart/form-data; boundary=----',
  authorization: 'Bearer token',
  'x-api-key': 'test-key',
};

function materialReq(
  path = '/api/materials',
  extras: Partial<Request> = {},
): Partial<Request> {
  return {
    method: 'POST',
    originalUrl: path,
    url: path,
    path,
    headers: { ...MULTIPART_HEADERS },
    ...extras,
  };
}

describe('isMaterialUpload', () => {
  it('deve reconhecer criação e anexos de material com ou sem /api', () => {
    expect(
      isMaterialUpload({
        method: 'POST',
        originalUrl: '/api/materials',
        url: '/api/materials',
        path: '/api/materials',
      }),
    ).toBe(true);
    expect(
      isMaterialUpload({
        method: 'POST',
        originalUrl: '/materials',
        url: '/materials',
        path: '/materials',
      }),
    ).toBe(true);
    expect(
      isMaterialUpload({
        method: 'POST',
        originalUrl: '/api/materials/abc/files?x=1',
        url: '/api/materials/abc/files?x=1',
        path: '/api/materials/abc/files',
      }),
    ).toBe(true);
  });

  it('não deve tratar outras rotas ou métodos como upload de material', () => {
    expect(
      isMaterialUpload({
        method: 'GET',
        originalUrl: '/api/materials',
        url: '/api/materials',
        path: '/api/materials',
      }),
    ).toBe(false);
    expect(
      isMaterialUpload({
        method: 'POST',
        originalUrl: '/api/materials/abc/template',
        url: '/api/materials/abc/template',
        path: '/api/materials/abc/template',
      }),
    ).toBe(false);
    expect(
      isMaterialUpload({
        method: 'POST',
        originalUrl: '/api/avatars',
        url: '/api/avatars',
        path: '/api/avatars',
      }),
    ).toBe(false);
  });
});

describe('multipartMiddleware', () => {
  const next = jest.fn() as jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockParseLimitedMultipart.mockReset();
    mockParseMaterialMultipart.mockReset();
    mockParsePrintMultipart.mockReset();
  });

  it('deve configurar parser em memória com teto e parser de material sem teto de MB', () => {
    expect(mockMulterOptionsList[1]).toEqual(
      expect.objectContaining({
        limits: {
          fileSize: MULTIPART_MAX_FILE_BYTES,
          files: MULTIPART_MAX_FILES,
        },
      }),
    );
    expect(mockMulterOptionsList[2]).toEqual(
      expect.objectContaining({
        limits: {
          files: MULTIPART_MAX_FILES,
        },
      }),
    );
    expect(mockMulterOptionsList[2]?.limits?.fileSize).toBeUndefined();
    expect(mockMulterOptionsList[0]?.limits).toMatchObject({
      fileSize: PRINT_IMAGE_MAX_BYTES,
      files: 20,
      fields: 3,
      parts: 23,
      fieldSize: 3 * 1024 * 1024,
    });
  });

  it('usa os limites de impressão apenas na criação da exportação', () => {
    mockParsePrintMultipart.mockImplementation((_req, _res, cb) => cb());
    multipartMiddleware(
      materialReq('/api/materials/mat/print-exports?x=1') as Request,
      new EventEmitter() as unknown as Response,
      next,
    );
    expect(mockParsePrintMultipart).toHaveBeenCalledTimes(1);
    expect(mockParseLimitedMultipart).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith();
  });

  it('recusa upload de impressão grande antes de consumir o body', () => {
    const req = materialReq('/api/materials/mat/print-exports', {
      headers: {
        ...MULTIPART_HEADERS,
        'content-length': String(PRINT_MULTIPART_MAX_BYTES + 1),
      },
    });
    multipartMiddleware(req as Request, {} as Response, next);
    expect(mockParsePrintMultipart).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.any(PayloadTooLargeException));
  });

  it('informa o limite de MiB nos erros de arquivos para impressão', () => {
    mockParsePrintMultipart.mockImplementation((_req, _res, cb) =>
      cb(new MulterError('LIMIT_FILE_SIZE')),
    );
    multipartMiddleware(
      materialReq('/materials/mat/print-exports') as Request,
      {} as Response,
      next,
    );
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining(`${PRINT_IMAGE_MAX_MB}MB`),
      }),
    );
  });

  it('deve chamar next sem parsear quando Content-Type não for multipart', () => {
    const req: Partial<Request> = {
      headers: { 'content-type': 'application/json' },
    };
    const res: Partial<Response> = {};

    multipartMiddleware(req as Request, res as Response, next);

    expect(mockParseLimitedMultipart).not.toHaveBeenCalled();
    expect(mockParseMaterialMultipart).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it('deve chamar next sem parsear quando content-type estiver ausente', () => {
    const req: Partial<Request> = { headers: {} };
    const res: Partial<Response> = {};

    multipartMiddleware(req as Request, res as Response, next);

    expect(mockParseLimitedMultipart).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it('não deve parsear multipart sem credenciais de auth', () => {
    const req: Partial<Request> = {
      headers: { 'content-type': 'multipart/form-data; boundary=----' },
    };
    const res: Partial<Response> = {};

    multipartMiddleware(req as Request, res as Response, next);

    expect(mockParseLimitedMultipart).not.toHaveBeenCalled();
    expect(mockParseMaterialMultipart).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedException));
  });

  it('não deve parsear material sem credenciais de auth', () => {
    const req = materialReq('/api/materials', {
      headers: { 'content-type': 'multipart/form-data; boundary=----' },
    });
    const res: Partial<Response> = {};

    multipartMiddleware(req as Request, res as Response, next);

    expect(mockParseMaterialMultipart).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedException));
  });

  it('não deve parsear quando Content-Length exceder o teto do request nas rotas em memória', () => {
    const req: Partial<Request> = {
      headers: {
        ...MULTIPART_HEADERS,
        'content-length': String(
          MULTIPART_MAX_FILE_BYTES * MULTIPART_MAX_FILES + 3 * 1024 * 1024,
        ),
      },
    };
    const res: Partial<Response> = {};

    multipartMiddleware(req as Request, res as Response, next);

    expect(mockParseLimitedMultipart).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.any(PayloadTooLargeException));
  });

  it('não deve recusar Content-Length grande em POST /api/materials', () => {
    mockParseMaterialMultipart.mockImplementation(
      (_req: unknown, _res: unknown, cb: () => void) => {
        cb();
      },
    );
    const req = materialReq('/api/materials', {
      headers: {
        ...MULTIPART_HEADERS,
        'content-length': String(300 * 1024 * 1024),
      },
    });
    const res = new EventEmitter() as unknown as Response;

    multipartMiddleware(req as Request, res, next);

    expect(mockParseMaterialMultipart).toHaveBeenCalled();
    expect(mockParseLimitedMultipart).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith();
  });

  it('deve usar parser de disco em POST /api/materials/:id/files', () => {
    mockParseMaterialMultipart.mockImplementation(
      (_req: unknown, _res: unknown, cb: () => void) => {
        cb();
      },
    );
    const req = materialReq('/api/materials/mat-1/files');
    const res = new EventEmitter() as unknown as Response;

    multipartMiddleware(req as Request, res, next);

    expect(mockParseMaterialMultipart).toHaveBeenCalled();
    expect(mockParseLimitedMultipart).not.toHaveBeenCalled();
  });

  it('deve converter LIMIT_FILE_SIZE em PayloadTooLargeException', () => {
    mockParseLimitedMultipart.mockImplementation(
      (_req: unknown, _res: unknown, cb: (e?: unknown) => void) => {
        cb(new MulterError('LIMIT_FILE_SIZE'));
      },
    );

    const req: Partial<Request> = { headers: { ...MULTIPART_HEADERS } };
    const res: Partial<Response> = {};

    multipartMiddleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(PayloadTooLargeException));
  });

  it('deve converter LIMIT_FILE_COUNT em BadRequestException', () => {
    mockParseLimitedMultipart.mockImplementation(
      (_req: unknown, _res: unknown, cb: (e?: unknown) => void) => {
        cb(new MulterError('LIMIT_FILE_COUNT'));
      },
    );

    const req: Partial<Request> = { headers: { ...MULTIPART_HEADERS } };
    const res: Partial<Response> = {};

    multipartMiddleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('arquivos por requisição'),
      }),
    );
  });

  it('deve invocar multer e propagar erro quando o parse falhar', () => {
    const err = new Error('upload falhou');
    mockParseLimitedMultipart.mockImplementation(
      (_req: unknown, _res: unknown, cb: (e?: unknown) => void) => {
        cb(err);
      },
    );

    const req: Partial<Request> = { headers: { ...MULTIPART_HEADERS } };
    const res: Partial<Response> = {};

    multipartMiddleware(req as Request, res as Response, next);

    expect(mockParseLimitedMultipart).toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(err);
  });

  it('deve definir req.file quando houver exatamente um arquivo', () => {
    const file = { fieldname: 'photo', originalname: 'a.png' };
    mockParseLimitedMultipart.mockImplementation(
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
      headers: { ...MULTIPART_HEADERS },
    } as any;
    const res: Partial<Response> = {};

    multipartMiddleware(req as Request, res as Response, next);

    expect(req.file).toBe(file);
    expect(next).toHaveBeenCalled();
  });

  it('deve não definir req.file quando não houver arquivos', () => {
    mockParseLimitedMultipart.mockImplementation(
      (req: { files?: unknown[] }, _res: unknown, cb: () => void) => {
        req.files = [];
        cb();
      },
    );

    const req: Partial<Request> = {
      headers: { ...MULTIPART_HEADERS },
    } as any;
    const res: Partial<Response> = {};

    multipartMiddleware(req as Request, res as Response, next);

    expect(req.file).toBeUndefined();
    expect(next).toHaveBeenCalled();
  });

  it('deve não definir req.file quando houver mais de um arquivo', () => {
    mockParseLimitedMultipart.mockImplementation(
      (req: { files?: unknown[] }, _res: unknown, cb: () => void) => {
        req.files = [{}, {}];
        cb();
      },
    );

    const req: Partial<Request> = {
      headers: { ...MULTIPART_HEADERS },
    } as any;
    const res: Partial<Response> = {};

    multipartMiddleware(req as Request, res as Response, next);

    expect(req.file).toBeUndefined();
    expect(next).toHaveBeenCalled();
  });

  it('deve limpar arquivos temporários de material ao finalizar a resposta', () => {
    const tempFile = {
      originalname: 'video.mp4',
      mimetype: 'video/mp4',
      path: '/tmp/omni-material-uploads/abc.mp4',
    };
    mockParseMaterialMultipart.mockImplementation(
      (
        req: { files?: unknown; file?: unknown },
        _res: unknown,
        cb: () => void,
      ) => {
        req.files = [tempFile];
        cb();
      },
    );
    const req = materialReq('/api/materials') as Request;
    const res = new EventEmitter() as unknown as Response;

    multipartMiddleware(req, res, next);

    res.emit('finish');

    expect(unlinkUploadTemp).toHaveBeenCalledWith(tempFile);
  });

  it('deve limpar temporários de impressão ao finalizar a resposta', () => {
    const tempFile = {
      originalname: 'photo.png',
      mimetype: 'image/png',
      path: '/tmp/omni-print-uploads/abc.png',
    };
    mockParsePrintMultipart.mockImplementation(
      (
        req: { files?: unknown; file?: unknown },
        _res: unknown,
        cb: () => void,
      ) => {
        req.files = [tempFile];
        cb();
      },
    );

    const req = materialReq('/api/materials/mat/print-exports') as Request;
    const res = new EventEmitter() as unknown as Response;

    multipartMiddleware(req, res, next);

    res.emit('finish');

    expect(unlinkUploadTemp).toHaveBeenCalledWith(tempFile);
  });

  it('deve gravar uploads de material em disco com a extensão original', () => {
    expect(mockDiskStorageOpts).toBeDefined();
    const cb = jest.fn();
    mockDiskStorageOpts!.filename(
      {},
      { originalname: 'apresentacao.pptx' },
      cb,
    );
    expect(cb).toHaveBeenCalledWith(null, expect.stringMatching(/\.pptx$/));
  });
});
