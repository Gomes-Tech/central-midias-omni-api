import { PrintImageInputService } from './print-image-input.service';
import {
  placeholder,
  placeholderDocument,
  printImageFile,
  printImagePreset,
  printPng,
  printJpegExif,
} from '../../../test-utils/print-image-fixtures';
import { PRINT_IMAGE_MAX_BYTES } from '@common/constants/print-image-limits';

describe('PrintImageInputService', () => {
  const owner = { id: 'export', organizationId: 'org', userId: 'user' };
  const binding = { layerId: 'photo', fileField: 'photo_file' };
  let rows: any[];
  let objects: Map<string, Buffer>;
  let prisma: any;
  let storage: any;
  let service: PrintImageInputService;

  beforeEach(() => {
    rows = [];
    objects = new Map();
    prisma = {
      printExportInput: {
        createMany: jest.fn(async ({ data }) => {
          rows.push(...data);
        }),
        findMany: jest.fn(async ({ where, take }) =>
          rows
            .filter(
              (row) =>
                (!where.id?.in || where.id.in.includes(row.id)) &&
                (!where.id?.gt || row.id > where.id.gt) &&
                (!where.exportId || row.exportId === where.exportId) &&
                (!where.organizationId ||
                  row.organizationId === where.organizationId) &&
                (!where.userId || row.userId === where.userId) &&
                (!where.expiresAt?.gt || row.expiresAt > where.expiresAt.gt) &&
                (!where.expiresAt?.lte || row.expiresAt <= where.expiresAt.lte),
            )
            .sort((a, b) => a.id.localeCompare(b.id))
            .slice(0, take ?? rows.length),
        ),
        updateMany: jest.fn(async ({ where, data }) => {
          rows
            .filter((row) => where.id.in.includes(row.id))
            .forEach((row) => Object.assign(row, data));
        }),
        deleteMany: jest.fn(async ({ where }) => {
          rows = rows.filter((row) => row.id !== where.id);
        }),
      },
    };
    storage = {
      writePrivateFile: jest.fn(async ({ path, buffer }) => {
        objects.set(path, buffer);
      }),
      readFile: jest.fn(async (path) => objects.get(path)),
      deleteFile: jest.fn(async (paths) => {
        paths.forEach((path) => objects.delete(path));
      }),
    };
    service = new PrintImageInputService(prisma, storage);
  });

  it('valida PNG real, calcula checksum e exige todas as imagens visíveis', () => {
    const [image] = service.prepare(
      placeholderDocument,
      [binding],
      [printImageFile()],
    );
    expect(image).toMatchObject({
      layerId: 'photo',
      width: 100,
      height: 100,
      mimeType: 'image/png',
      fit: 'cover',
      positionX: 0.5,
      positionY: 0.5,
      zoom: 1,
    });
    expect(image.checksum).toMatch(/^[a-f0-9]{64}$/);
    expect(() => service.prepare(placeholderDocument)).toThrow('photo');
  });

  it('ignora marcadores ocultos, mas rejeita imagem vinculada a eles', () => {
    const document = {
      ...placeholderDocument,
      layers: [{ ...placeholder, isVisible: false }],
    };
    expect(service.prepare(document)).toEqual([]);
    expect(() =>
      service.prepare(document, [binding], [printImageFile()]),
    ).toThrow('associação não permitida');
  });

  it('aceita JPEG e considera EXIF na resolução para impressão', () => {
    const file = {
      ...printImageFile(printJpegExif),
      mimetype: 'image/jpeg',
      originalname: 'photo.jpg',
    };
    const [image] = service.prepare(placeholderDocument, [binding], [file]);
    expect(image).toMatchObject({
      width: 40,
      height: 80,
      mimeType: 'image/jpeg',
    });
    expect(() =>
      service.prepare(
        placeholderDocument,
        [binding],
        [
          {
            ...file,
            buffer: printJpegExif.subarray(0, -2),
            size: printJpegExif.length - 2,
          },
        ],
      ),
    ).toThrow('Marcador photo');
  });

  it('aceita PNG com canal alpha', () => {
    const file = printImageFile(
      printPng(100, 100, (x) => [220, 30, 40, x < 50 ? 0 : 255]),
    );
    expect(
      service.prepare(placeholderDocument, [binding], [file])[0],
    ).toMatchObject({ width: 100, height: 100, mimeType: 'image/png' });
  });

  it.each([
    [
      'camada desconhecida',
      [{ ...binding, layerId: 'missing' }],
      [printImageFile()],
    ],
    ['binding duplicado', [binding, binding], [printImageFile()]],
    ['arquivo duplicado', [binding], [printImageFile(), printImageFile()]],
    [
      'campo ausente',
      [{ ...binding, fileField: 'missing' }],
      [printImageFile()],
    ],
    [
      'arquivo excedente',
      [binding],
      [printImageFile(), printImageFile(undefined, 'extra')],
    ],
    [
      'enquadramento inválido',
      [{ ...binding, fit: 'contain' as const, zoom: 4 }],
      [printImageFile()],
    ],
  ])('rejeita %s', (_label, bindings, files) => {
    expect(() =>
      service.prepare(placeholderDocument, bindings, files),
    ).toThrow();
    expect(storage.writePrivateFile).not.toHaveBeenCalled();
  });

  it.each([
    ['vazio', () => printImageFile(Buffer.alloc(0))],
    ['MIME falso', () => ({ ...printImageFile(), mimetype: 'image/jpeg' })],
    ['cabeçalho sem pixels', () => printImageFile(printPng().subarray(0, 24))],
    ['PNG truncado', () => printImageFile(printPng().subarray(0, -1))],
    [
      'profundidade inválida',
      () => {
        const buffer = printPng();
        buffer[24] = 255;
        return printImageFile(buffer);
      },
    ],
    ['tamanho divergente', () => ({ ...printImageFile(), size: 1 })],
    [
      'resolução excessiva',
      () => {
        const buffer = printPng();
        buffer.writeUInt32BE(6001, 16);
        return printImageFile(buffer);
      },
    ],
    [
      'pixels excessivos',
      () => {
        const buffer = printPng();
        buffer.writeUInt32BE(6000, 16);
        buffer.writeUInt32BE(6000, 20);
        return printImageFile(buffer);
      },
    ],
    [
      'pixels corrompidos',
      () => {
        const buffer = printPng();
        buffer[45] ^= 0xff;
        return printImageFile(buffer);
      },
    ],
    [
      'chunk com comprimento falso',
      () => {
        const buffer = printPng();
        buffer.writeUInt32BE(0xffffffff, 33);
        return printImageFile(buffer);
      },
    ],
  ])('rejeita %s antes de persistir', (_label, makeFile) => {
    expect(() =>
      service.prepare(placeholderDocument, [binding], [makeFile()]),
    ).toThrow('Marcador photo');
    expect(prisma.printExportInput.createMany).not.toHaveBeenCalled();
  });

  it('retorna 413 acima de 5 MiB', () => {
    try {
      service.prepare(
        placeholderDocument,
        [binding],
        [{ ...printImageFile(), size: PRINT_IMAGE_MAX_BYTES + 1 }],
      );
      throw new Error('deveria falhar');
    } catch (error) {
      expect(error.getStatus()).toBe(413);
    }
  });

  it('calcula DPI pelo eixo limitante do cover', () => {
    const images = service.prepare(
      placeholderDocument,
      [binding],
      [printImageFile(printPng(100, 20))],
    );
    expect(() =>
      service.validateDpi(placeholderDocument, images, printImagePreset),
    ).toThrow('photo');
    expect(() =>
      service.validateDpi(placeholderDocument, images, {
        ...printImagePreset,
        minimumDpi: 50,
      }),
    ).not.toThrow();
  });

  it('calcula o DPI pelo contain e reduz a resolução efetiva com zoom', () => {
    const contained = service.prepare(
      placeholderDocument,
      [{ ...binding, fit: 'contain', zoom: 2 }],
      [printImageFile(printPng(100, 20))],
    );
    expect(() =>
      service.validateDpi(placeholderDocument, contained, {
        ...printImagePreset,
        minimumDpi: 100,
      }),
    ).not.toThrow();

    expect(() =>
      service.validateDpi(placeholderDocument, [{ ...contained[0], zoom: 3 }], {
        ...printImagePreset,
        minimumDpi: 100,
      }),
    ).toThrow('photo');
  });

  it('registra antes do upload e carrega arquivos apenas da exportação e do proprietário', async () => {
    const images = service.prepare(
      placeholderDocument,
      [
        {
          ...binding,
          fit: 'contain',
          positionX: 0.25004,
          positionY: 0.74996,
          zoom: 1.50004,
        },
      ],
      [printImageFile()],
    );
    const ids = await service.stage(owner, images);
    expect(
      prisma.printExportInput.createMany.mock.invocationCallOrder[0],
    ).toBeLessThan(storage.writePrivateFile.mock.invocationCallOrder[0]);
    expect(rows[0].storageKey).toMatch(
      /^print-export-inputs\/org\/export\/[a-f0-9-]+\.png$/,
    );
    expect(rows[0]).not.toHaveProperty('buffer');
    expect(rows[0]).toMatchObject({
      fitMode: 'contain',
      positionX: 0.25,
      positionY: 0.75,
      zoom: 1.5,
    });
    expect(
      (await service.load(owner, placeholderDocument, ids)).get('photo'),
    ).toMatchObject({
      checksum: images[0].checksum,
      fit: 'contain',
      positionX: 0.25,
      positionY: 0.75,
      zoom: 1.5,
    });
    await expect(
      service.load({ ...owner, userId: 'other' }, placeholderDocument, ids),
    ).rejects.toThrow('ausentes');
    await expect(
      service.load(
        { ...owner, organizationId: 'other' },
        placeholderDocument,
        ids,
      ),
    ).rejects.toThrow('ausentes');
    await expect(
      service.load({ ...owner, id: 'other' }, placeholderDocument, ids),
    ).rejects.toThrow('ausentes');
  });

  it('detecta alteração do arquivo e expiração antes de renderizar', async () => {
    const images = service.prepare(
      placeholderDocument,
      [binding],
      [printImageFile()],
    );
    const ids = await service.stage(owner, images);
    objects.set(rows[0].storageKey, Buffer.from('changed'));
    await expect(service.load(owner, placeholderDocument, ids)).rejects.toThrow(
      'inconsistente',
    );
    rows[0].expiresAt = new Date(0);
    await expect(service.load(owner, placeholderDocument, ids)).rejects.toThrow(
      'expiradas',
    );
  });

  it('usa chaves diferentes por tentativa e limpa somente a tentativa pedida', async () => {
    const images = service.prepare(
      placeholderDocument,
      [binding],
      [printImageFile()],
    );
    const first = await service.stage(owner, images);
    const second = await service.stage(owner, images);
    expect(first).not.toEqual(second);
    await service.cleanup(first);
    expect(objects.size).toBe(1);
    expect((await service.load(owner, placeholderDocument, second)).size).toBe(
      1,
    );
  });

  it('compensa upload parcial e mantém rastreio se a exclusão falhar', async () => {
    const images = service.prepare(
      placeholderDocument,
      [binding],
      [printImageFile()],
    );
    storage.writePrivateFile
      .mockImplementationOnce(async ({ path, buffer }) => {
        objects.set(path, buffer);
      })
      .mockRejectedValueOnce(new Error('storage'));
    let failExistingObject = true;
    storage.deleteFile.mockImplementation(async (paths: string[]) => {
      if (failExistingObject && paths.some((path) => objects.has(path))) {
        failExistingObject = false;
        throw new Error('delete');
      }
      paths.forEach((path) => objects.delete(path));
    });
    await expect(
      service.stage(owner, [
        images[0],
        { ...images[0], layerId: 'second-photo' },
      ]),
    ).rejects.toThrow('storage');
    expect(rows).toHaveLength(1);
    expect(objects.size).toBe(1);
    expect(rows[0].expiresAt.getTime()).toBeLessThanOrEqual(Date.now());
    await service.expireInputs();
    expect(rows).toHaveLength(0);
    expect(objects.size).toBe(0);
  });

  it('limpa mais de um lote de órfãos sem depender de template ou exportação', async () => {
    rows = Array.from({ length: 105 }, (_, i) => ({
      id: String(i).padStart(3, '0'),
      storageKey: `expired/${i}`,
      expiresAt: new Date(0),
    }));
    expect(await service.expireInputs()).toBe(105);
    expect(rows).toHaveLength(0);
  });
});
