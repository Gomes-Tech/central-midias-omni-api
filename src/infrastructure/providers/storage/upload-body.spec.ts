import { InternalServerErrorException } from '@nestjs/common';
import { createReadStream, promises as fsp } from 'node:fs';
import { Readable } from 'node:stream';
import {
  resolveUploadBody,
  resolveUploadMimeType,
  unlinkUploadTemp,
} from './upload-body';

jest.mock('node:fs', () => {
  const actual = jest.requireActual('node:fs');
  return {
    ...actual,
    createReadStream: jest.fn(),
    promises: {
      ...actual.promises,
      unlink: jest.fn(),
    },
  };
});

describe('upload-body', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolveUploadBody deve devolver stream quando houver path', () => {
    const stream = Readable.from(['x']);
    jest.mocked(createReadStream).mockReturnValue(stream as never);

    const body = resolveUploadBody({
      originalname: 'video.mp4',
      mimetype: 'video/mp4',
      size: 10,
      path: '/tmp/omni-material-uploads/a.mp4',
    });

    expect(createReadStream).toHaveBeenCalledWith(
      '/tmp/omni-material-uploads/a.mp4',
    );
    expect(body).toBe(stream);
  });

  it('resolveUploadBody deve devolver buffer quando não houver path', () => {
    const buffer = Buffer.from('pdf');
    expect(
      resolveUploadBody({
        originalname: 'doc.pdf',
        mimetype: 'application/pdf',
        size: 3,
        buffer,
      }),
    ).toBe(buffer);
  });

  it('resolveUploadBody deve lançar quando não houver path nem buffer', () => {
    expect(() =>
      resolveUploadBody({
        originalname: 'vazio.bin',
        mimetype: 'application/octet-stream',
        size: 0,
      }),
    ).toThrow(InternalServerErrorException);
  });

  it('resolveUploadMimeType deve preservar o mimetype do parser', () => {
    expect(
      resolveUploadMimeType({
        originalname: 'planilha.xlsx',
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        size: 1,
        buffer: Buffer.from('x'),
      }),
    ).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
  });

  it('resolveUploadMimeType deve usar octet-stream quando o mime estiver vazio', () => {
    expect(
      resolveUploadMimeType({
        originalname: 'arquivo',
        mimetype: '',
        size: 1,
        buffer: Buffer.from('x'),
      }),
    ).toBe('application/octet-stream');
  });

  it('unlinkUploadTemp deve remover o arquivo quando houver path', async () => {
    jest.mocked(fsp.unlink).mockResolvedValue(undefined);

    await unlinkUploadTemp({ path: '/tmp/omni-material-uploads/a.mp4' });

    expect(fsp.unlink).toHaveBeenCalledWith(
      '/tmp/omni-material-uploads/a.mp4',
    );
  });

  it('unlinkUploadTemp não deve chamar unlink sem path', async () => {
    await unlinkUploadTemp({});
    expect(fsp.unlink).not.toHaveBeenCalled();
  });
});
