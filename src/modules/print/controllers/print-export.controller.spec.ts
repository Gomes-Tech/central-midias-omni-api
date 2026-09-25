import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { json } from 'express';
import { readFileSync } from 'node:fs';
import { multipartMiddleware } from '@common/middlewares/multipart.middleware';
import { PRINT_IMAGE_MAX_BYTES } from '@common/constants/print-image-limits';
import { PrintExportController } from './print-export.controller';
import { PrintExportService } from '../services/print-export.service';
import {
  placeholderDocument,
  printPng,
} from '../../../test-utils/print-image-fixtures';

describe('PrintExportController multipart contract', () => {
  let app: INestApplication;
  let receivedFiles: Express.Multer.File[] = [];
  // As imagens chegam em disco (streaming); os bytes são lidos ainda dentro do
  // handler porque o temporário é removido quando a resposta termina.
  const create = jest.fn(
    async (
      _materialId: string,
      _organizationId: string,
      _userId: string,
      _dto: unknown,
      files: Express.Multer.File[] = [],
    ) => {
      receivedFiles = files.map((file) => ({
        ...file,
        buffer: file.path ? readFileSync(file.path) : file.buffer,
      }));
      return { id: 'export', status: 'QUEUED' };
    },
  );
  const headers = { authorization: 'Bearer test', 'x-api-key': 'test' };
  const path = '/api/materials/material/print-exports';

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [PrintExportController],
      providers: [{ provide: PrintExportService, useValue: { create } }],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(multipartMiddleware);
    app.use(json({ limit: '3mb' }));
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });
  beforeEach(() => {
    create.mockClear();
    receivedFiles = [];
  });
  afterAll(async () => {
    await app.close();
  });

  it('recebe JSON e multipart pela mesma rota', async () => {
    await request(app.getHttpServer())
      .post(path)
      .send({ document: placeholderDocument, idempotencyKey: 'json' })
      .expect(201);
    expect(create.mock.calls[0][3]).toMatchObject({
      document: placeholderDocument,
      idempotencyKey: 'json',
    });
    expect(create.mock.calls[0][4]).toEqual([]);
    await request(app.getHttpServer())
      .post(path)
      .set(headers)
      .field('document', JSON.stringify(placeholderDocument))
      .field('idempotencyKey', 'multipart')
      .field(
        'imageBindings',
        JSON.stringify([
          {
            layerId: 'photo',
            fileField: 'photo_file',
            fit: 'contain',
            positionX: 0.25,
            positionY: 0.75,
            zoom: 1.5,
          },
        ]),
      )
      .attach('photo_file', printPng(), {
        filename: 'photo.png',
        contentType: 'image/png',
      })
      .expect(201);
    expect(create.mock.calls[1][3]).toMatchObject({
      document: placeholderDocument,
      imageBindings: [
        {
          layerId: 'photo',
          fileField: 'photo_file',
          fit: 'contain',
          positionX: 0.25,
          positionY: 0.75,
          zoom: 1.5,
        },
      ],
    });
    expect(receivedFiles[0]).toMatchObject({
      fieldname: 'photo_file',
      mimetype: 'image/png',
      buffer: printPng(),
    });
  });

  it('não encaminha JSON inválido nem bindings com campos extras', async () => {
    await request(app.getHttpServer())
      .post(path)
      .set(headers)
      .field('document', '{invalid')
      .field('idempotencyKey', 'key')
      .expect(400);
    await request(app.getHttpServer())
      .post(path)
      .set(headers)
      .field('document', JSON.stringify(placeholderDocument))
      .field('idempotencyKey', 'key')
      .field(
        'imageBindings',
        '[{"layerId":"photo","fileField":"photo_file","url":"https://example.com"}]',
      )
      .expect(400);
    expect(create).not.toHaveBeenCalled();
  });

  it('declara o teto por foto no interceptor global de tamanho', () => {
    // Sem isso o interceptor aplicaria o padrão de 5 MiB e barraria as fotos.
    expect(
      Reflect.getMetadata(
        'maxFileSize',
        PrintExportController.prototype.create,
      ),
    ).toBe(PRINT_IMAGE_MAX_BYTES);
  });

  it('barra arquivos acima do limite durante o parse', async () => {
    await request(app.getHttpServer())
      .post(path)
      .set(headers)
      .field('document', JSON.stringify(placeholderDocument))
      .field('idempotencyKey', 'key')
      .attach(
        'photo_file',
        Buffer.alloc(PRINT_IMAGE_MAX_BYTES + 1),
        'photo.png',
      )
      .expect(413);
    expect(create).not.toHaveBeenCalled();
  });
});
