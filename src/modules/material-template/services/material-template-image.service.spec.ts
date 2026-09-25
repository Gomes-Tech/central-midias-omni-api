import { readFileSync } from 'node:fs';
import {
  MATERIAL_TEMPLATE_IMAGE_MAX_BYTES,
  MATERIAL_TEMPLATE_IMAGE_MAX_SIDE,
  MATERIAL_TEMPLATE_IMAGE_MAX_SIZE_MESSAGE,
  MATERIAL_TEMPLATE_IMAGE_RESOLUTION_MESSAGE,
  MaterialTemplateImageService,
} from './material-template-image.service';

jest.mock('node:fs', () => {
  const actual = jest.requireActual('node:fs');
  return {
    ...actual,
    readFileSync: jest.fn(),
  };
});

function file(buffer: Buffer, overrides: Partial<Express.Multer.File> = {}) {
  return {
    fieldname: 'file',
    originalname: 'base.png',
    encoding: '7bit',
    mimetype: 'image/png',
    size: buffer.length,
    buffer,
    ...overrides,
  } as Express.Multer.File;
}

function png(width: number, height: number) {
  const buffer = Buffer.alloc(24);
  Buffer.from('89504e470d0a1a0a', 'hex').copy(buffer);
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  return buffer;
}

describe('MaterialTemplateImageService', () => {
  const service = new MaterialTemplateImageService();

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('detecta PNG pelo conteúdo e retorna dimensões naturais', () => {
    expect(service.validate(file(png(1920, 1080)))).toEqual({
      width: 1920,
      height: 1080,
      mimeType: 'image/png',
    });
  });

  it('aceita a imagem base de 2584 por 3876 pixels', () => {
    expect(service.validate(file(png(2584, 3876)))).toEqual({
      width: 2584,
      height: 3876,
      mimeType: 'image/png',
    });
  });

  it('rejeita arquivo que apenas declara um MIME de imagem', () => {
    expect(() => service.validate(file(Buffer.from('not an image')))).toThrow(
      'A imagem base deve ser PNG ou JPEG válido',
    );
  });

  it('rejeita lado e área acima dos limites', () => {
    expect(() =>
      service.validate(file(png(MATERIAL_TEMPLATE_IMAGE_MAX_SIDE + 1, 100))),
    ).toThrow(MATERIAL_TEMPLATE_IMAGE_RESOLUTION_MESSAGE);
    expect(() => service.validate(file(png(11000, 11000)))).toThrow(
      MATERIAL_TEMPLATE_IMAGE_RESOLUTION_MESSAGE,
    );
  });

  it('aceita imagens de grande formato para impressão de alta qualidade', () => {
    expect(service.validate(file(png(8000, 10000)))).toEqual({
      width: 8000,
      height: 10000,
      mimeType: 'image/png',
    });
  });

  it('aplica o limite efetivo de 30 MB', () => {
    expect(() =>
      service.validate(
        file(png(100, 100), { size: MATERIAL_TEMPLATE_IMAGE_MAX_BYTES + 1 }),
      ),
    ).toThrow(MATERIAL_TEMPLATE_IMAGE_MAX_SIZE_MESSAGE);
  });

  it('aceita imagens pesadas de alta qualidade dentro de 30 MB', () => {
    expect(
      service.validate(file(png(3000, 4000), { size: 25 * 1024 * 1024 })),
    ).toEqual({
      width: 3000,
      height: 4000,
      mimeType: 'image/png',
    });
  });

  it('rejeita conteúdo acima do limite mesmo com tamanho declarado menor', () => {
    const buffer = Buffer.alloc(MATERIAL_TEMPLATE_IMAGE_MAX_BYTES + 1);
    Buffer.from('89504e470d0a1a0a', 'hex').copy(buffer);
    buffer.writeUInt32BE(100, 16);
    buffer.writeUInt32BE(100, 20);

    expect(() => service.validate(file(buffer, { size: 24 }))).toThrow(
      MATERIAL_TEMPLATE_IMAGE_MAX_SIZE_MESSAGE,
    );
  });

  it('lê a imagem do path quando não houver buffer', () => {
    const buffer = png(320, 240);
    jest.mocked(readFileSync).mockReturnValue(buffer);

    expect(
      service.validate({
        size: buffer.length,
        path: '/tmp/omni-material-uploads/base.png',
      }),
    ).toEqual({
      width: 320,
      height: 240,
      mimeType: 'image/png',
    });
    expect(readFileSync).toHaveBeenCalledWith(
      '/tmp/omni-material-uploads/base.png',
    );
  });
});
