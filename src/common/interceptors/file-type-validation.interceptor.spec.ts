import { BadRequestException, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { FileTypeValidationInterceptor } from './file-type-validation.interceptor';

function multerFile(
  originalname: string,
  mimetype?: string,
  size = 0,
): Express.Multer.File {
  return {
    originalname,
    mimetype: mimetype ?? '',
    fieldname: 'file',
    encoding: '7bit',
    size,
    destination: '',
    filename: '',
    path: '',
    buffer: Buffer.alloc(0),
  } as Express.Multer.File;
}

function createContext(request: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

describe('FileTypeValidationInterceptor', () => {
  const interceptor = new FileTypeValidationInterceptor();

  it('deve delegar quando não há arquivo', async () => {
    const next = { handle: () => of('ok') };

    await expect(
      lastValueFrom(interceptor.intercept(createContext({}), next)),
    ).resolves.toBe('ok');
  });

  it('deve permitir tipo aceito pela API (arquivo único)', async () => {
    const next = { handle: () => of(1) };
    const file = multerFile('rel.pdf', 'application/pdf');

    await expect(
      lastValueFrom(
        interceptor.intercept(createContext({ file }), next),
      ),
    ).resolves.toBe(1);
  });

  it('deve rejeitar extensão não permitida', () => {
    const next = { handle: () => of(1) };
    const file = multerFile('x.exe', 'application/octet-stream');

    expect(() =>
      interceptor.intercept(createContext({ file }), next),
    ).toThrow(BadRequestException);
  });

  it('deve validar cada item de request.files em array', () => {
    const next = { handle: () => of(1) };
    const files = [
      multerFile('ok.png', 'image/png'),
      multerFile('bad.exe', 'application/octet-stream'),
    ];

    expect(() =>
      interceptor.intercept(createContext({ files }), next),
    ).toThrow(BadRequestException);
  });

  it('deve validar request.files como objeto com arrays por campo', async () => {
    const next = { handle: () => of(1) };
    const files = {
      imgs: [multerFile('ok.png', 'image/png')],
    };

    await expect(
      lastValueFrom(interceptor.intercept(createContext({ files }), next)),
    ).resolves.toBe(1);
  });

  it('deve validar arquivo único em campo objeto (não array)', async () => {
    const next = { handle: () => of(1) };
    const files = {
      doc: multerFile('doc.pdf', 'application/pdf'),
    };

    await expect(
      lastValueFrom(interceptor.intercept(createContext({ files }), next)),
    ).resolves.toBe(1);
  });

  it('deve ignorar entrada em objeto que não pareça arquivo', async () => {
    const next = { handle: () => of(1) };
    const files = { meta: { notAFile: true } };

    await expect(
      lastValueFrom(interceptor.intercept(createContext({ files }), next)),
    ).resolves.toBe(1);
  });

  it('deve ignorar slots nulos no array de arquivos', async () => {
    const next = { handle: () => of(1) };
    const files = [undefined, multerFile('ok.png', 'image/png')] as never;

    await expect(
      lastValueFrom(interceptor.intercept(createContext({ files }), next)),
    ).resolves.toBe(1);
  });
});
