import { MaterialTemplateImageService } from './material-template-image.service';

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

  it('detecta PNG pelo conteúdo e retorna dimensões naturais', () => {
    expect(service.validate(file(png(1920, 1080)))).toEqual({
      width: 1920,
      height: 1080,
      mimeType: 'image/png',
    });
  });

  it('rejeita arquivo que apenas declara um MIME de imagem', () => {
    expect(() => service.validate(file(Buffer.from('not an image')))).toThrow(
      'A imagem base deve ser PNG ou JPEG válido',
    );
  });

  it('rejeita lado e área acima dos limites', () => {
    expect(() => service.validate(file(png(3841, 100)))).toThrow(
      'A imagem base excede o limite de resolução permitido',
    );
    expect(() => service.validate(file(png(3000, 3000)))).toThrow(
      'A imagem base excede o limite de resolução permitido',
    );
  });

  it('aplica o limite efetivo de 5 MB', () => {
    expect(() =>
      service.validate(file(png(100, 100), { size: 5 * 1024 * 1024 + 1 })),
    ).toThrow('A imagem base deve ter no máximo 5 MB');
  });
});
