import { BadRequestException } from '@common/filters';
import { AssetFileValidationService } from './asset-file-validation.service';

function file(
  originalname: string,
  mimetype: string,
  buffer: Buffer,
): Express.Multer.File {
  return {
    originalname,
    mimetype,
    buffer,
    size: buffer.length,
    fieldname: 'files',
  } as Express.Multer.File;
}

describe('AssetFileValidationService', () => {
  const service = new AssetFileValidationService();
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64',
  );
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0xff, 0xd9]);

  it('deve validar PNG e derivar nome sem extensão', () => {
    const result = service.prepare(file('Minha Logo.png', 'image/png', png));

    expect(result).toEqual({
      buffer: png,
      extension: 'png',
      mimeType: 'image/png',
      size: png.length,
      defaultName: 'Minha Logo',
    });
  });

  it('deve recuperar nome UTF-8 recebido como Latin-1 pelo multipart', () => {
    const result = service.prepare(
      file('Logo PrimÃ¡ria.png', 'image/png', png),
    );

    expect(result.defaultName).toBe('Logo Primária');
  });

  it('deve normalizar JPG para image/jpeg', () => {
    const result = service.prepare(file('foto.jpg', 'image/jpg', jpeg));

    expect(result.extension).toBe('jpg');
    expect(result.mimeType).toBe('image/jpeg');
  });

  it.each([
    file('vazio.png', 'image/png', Buffer.alloc(0)),
    file('falso.png', 'image/png', Buffer.from('not-png')),
    file('foto.jpg', 'image/png', jpeg),
    file('arquivo.gif', 'image/gif', Buffer.from('gif')),
  ])('deve rejeitar arquivo inválido %#', (invalidFile) => {
    expect(() => service.prepare(invalidFile)).toThrow(BadRequestException);
  });

  it('deve sanitizar SVG preservando elementos visuais seguros', () => {
    const source = Buffer.from(`
      <?xml version="1.0" encoding="UTF-8"?>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" onload="alert(1)">
        <script>alert(1)</script>
        <style>.x { fill: url(https://evil.test/a); }</style>
        <defs><linearGradient id="gradient"><stop offset="0" stop-color="#fff" /></linearGradient></defs>
        <path class="x" d="M0 0L20 20" fill="url(#gradient)" onclick="alert(2)" />
        <use href="#shape" />
        <use href="https://evil.test/shape.svg#x" />
        <foreignObject><div>html</div></foreignObject>
      </svg>
    `);

    const result = service.prepare(file('vetor.svg', 'image/svg+xml', source));
    const sanitized = result.buffer.toString('utf8');

    expect(sanitized).toContain('viewBox="0 0 20 20"');
    expect(sanitized).toContain('<linearGradient');
    expect(sanitized).toContain('fill="url(#gradient)"');
    expect(sanitized).toContain('href="#shape"');
    expect(sanitized).not.toMatch(
      /script|onload|onclick|foreignObject|evil\.test|<style/i,
    );
    expect(result.size).toBe(result.buffer.length);
  });

  it('deve rejeitar conteúdo sem raiz SVG', () => {
    expect(() =>
      service.prepare(
        file('fake.svg', 'image/svg+xml', Buffer.from('<html></html>')),
      ),
    ).toThrow(BadRequestException);
  });
});
