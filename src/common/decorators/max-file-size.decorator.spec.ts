import { MAX_FILE_SIZE_KEY, MaxFileSize } from './max-file-size.decorator';

const MB = 1024 * 1024;

class Bytes {
  @MaxFileSize(2 * MB)
  a() {}
}

class FromMb {
  @MaxFileSize(undefined, 10)
  b() {}
}

class Default {
  @MaxFileSize()
  c() {}
}

describe('max-file-size.decorator', () => {
  it('deve registrar tamanho em bytes', () => {
    expect(Reflect.getMetadata(MAX_FILE_SIZE_KEY, Bytes.prototype.a)).toBe(
      2 * MB,
    );
  });

  it('deve converter MB para bytes', () => {
    expect(Reflect.getMetadata(MAX_FILE_SIZE_KEY, FromMb.prototype.b)).toBe(
      10 * MB,
    );
  });

  it('deve usar 5MB quando nenhum valor for passado', () => {
    expect(Reflect.getMetadata(MAX_FILE_SIZE_KEY, Default.prototype.c)).toBe(
      5 * MB,
    );
  });
});
