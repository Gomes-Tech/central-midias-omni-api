import { ValidationPipe } from '@nestjs/common';
import { CreatePrintExportDTO } from './create-print-export.dto';
import { placeholderDocument } from '../../../test-utils/print-image-fixtures';

describe('CreatePrintExportDTO', () => {
  const pipe = new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  const parse = (value: unknown) =>
    pipe.transform(value, { type: 'body', metatype: CreatePrintExportDTO });

  it('aceita o contrato JSON existente e o documento multipart', async () => {
    const dto = { document: placeholderDocument, idempotencyKey: 'key' };
    expect(await parse(dto)).toEqual(dto);
    expect(
      await parse({
        ...dto,
        document: JSON.stringify(dto.document),
        imageBindings: JSON.stringify([
          {
            layerId: 'photo',
            fileField: 'photo_0',
            fit: 'contain',
            positionX: 0.25,
            positionY: 0.75,
            zoom: 1.5,
          },
        ]),
      }),
    ).toEqual({
      ...dto,
      imageBindings: [
        {
          layerId: 'photo',
          fileField: 'photo_0',
          fit: 'contain',
          positionX: 0.25,
          positionY: 0.75,
          zoom: 1.5,
        },
      ],
    });
  });

  it.each([
    { document: '{invalid' },
    { imageBindings: '{invalid' },
    { imageBindings: '{}' },
    { imageBindings: '[null]' },
    {
      imageBindings:
        '[{"layerId":"photo","fileField":"photo_0","url":"https://example.com"}]',
    },
    { imageBindings: '[{"layerId":"photo","fileField":"../photo"}]' },
    { imageBindings: '[{"layerId":"photo","fileField":"photo","fit":"fill"}]' },
    {
      imageBindings: '[{"layerId":"photo","fileField":"photo","positionX":-1}]',
    },
    {
      imageBindings: '[{"layerId":"photo","fileField":"photo","positionY":2}]',
    },
    { imageBindings: '[{"layerId":"photo","fileField":"photo","zoom":3.1}]' },
  ])('rejeita payload inválido %j', async (patch) => {
    await expect(
      parse({ document: placeholderDocument, idempotencyKey: 'key', ...patch }),
    ).rejects.toThrow();
  });
});
