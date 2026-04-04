import { BadRequestException, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { lastValueFrom, of } from 'rxjs';
import { MAX_FILE_SIZE_KEY } from '../decorators/max-file-size.decorator';
import { FileSizeValidationInterceptor } from './file-size-validation.interceptor';

const MB = 1024 * 1024;

function multerFile(
  overrides: Partial<Express.Multer.File> = {},
): Express.Multer.File {
  return {
    fieldname: 'file',
    originalname: 'f.bin',
    encoding: '7bit',
    mimetype: 'application/octet-stream',
    size: 0,
    destination: '',
    filename: '',
    path: '',
    buffer: Buffer.alloc(0),
    ...overrides,
  } as Express.Multer.File;
}

function createContext(request: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: jest.fn(),
    getClass: jest.fn(),
  } as unknown as ExecutionContext;
}

describe('FileSizeValidationInterceptor', () => {
  let reflector: { getAllAndOverride: jest.Mock };
  let interceptor: FileSizeValidationInterceptor;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    interceptor = new FileSizeValidationInterceptor(
      reflector as unknown as Reflector,
    );
  });

  it('deve delegar quando não há arquivo', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const next = { handle: () => of('ok') };
    const ctx = createContext({});

    await expect(
      lastValueFrom(interceptor.intercept(ctx, next)),
    ).resolves.toBe('ok');
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
      MAX_FILE_SIZE_KEY,
      expect.any(Array),
    );
  });

  it('deve usar 5MB como padrão quando metadata não define limite', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const file = multerFile({ size: 5 * MB, originalname: 'ok.bin' });
    const next = { handle: () => of(1) };
    const ctx = createContext({ file });

    await expect(
      lastValueFrom(interceptor.intercept(ctx, next)),
    ).resolves.toBe(1);
  });

  it('deve respeitar limite vindo do Reflector', async () => {
    reflector.getAllAndOverride.mockReturnValue(2 * MB);
    const file = multerFile({ size: MB, originalname: 'a.bin' });
    const next = { handle: () => of(1) };

    await expect(
      lastValueFrom(
        interceptor.intercept(createContext({ file }), next),
      ),
    ).resolves.toBe(1);
  });

  it('deve lançar BadRequest quando arquivo único excede o limite', () => {
    reflector.getAllAndOverride.mockReturnValue(MB);
    const file = multerFile({ size: MB + 100, originalname: 'grande.bin' });
    const next = { handle: () => of(1) };

    expect(() =>
      interceptor.intercept(createContext({ file }), next),
    ).toThrow(BadRequestException);
  });

  it('deve validar array de arquivos', () => {
    reflector.getAllAndOverride.mockReturnValue(MB);
    const files = [
      multerFile({ size: 100, originalname: 'a' }),
      multerFile({ size: MB + 100, originalname: 'b' }),
    ];
    const next = { handle: () => of(1) };

    expect(() =>
      interceptor.intercept(createContext({ files }), next),
    ).toThrow(BadRequestException);
  });

  it('deve validar arquivos em objeto por campo', () => {
    reflector.getAllAndOverride.mockReturnValue(MB);
    const files = {
      a: [multerFile({ size: MB + 100, originalname: 'x.png' })],
    };
    const next = { handle: () => of(1) };

    expect(() =>
      interceptor.intercept(createContext({ files }), next),
    ).toThrow(BadRequestException);
  });

  it('deve validar arquivo único dentro de objeto (campo não-array)', () => {
    reflector.getAllAndOverride.mockReturnValue(MB);
    const files = {
      doc: multerFile({ size: MB + 100, originalname: 'doc.pdf' }),
    };
    const next = { handle: () => of(1) };

    expect(() =>
      interceptor.intercept(createContext({ files }), next),
    ).toThrow(BadRequestException);
  });

  it('deve ignorar arquivo nulo na lista', async () => {
    reflector.getAllAndOverride.mockReturnValue(MB);
    const next = { handle: () => of(1) };
    const files = [null, multerFile({ size: 100, originalname: 'ok.png' })];

    await expect(
      lastValueFrom(interceptor.intercept(createContext({ files }), next)),
    ).resolves.toBe(1);
  });
});
