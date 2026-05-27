import { Test, TestingModule } from '@nestjs/testing';
import { StorageService } from '@infrastructure/providers';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;
  let storageService: { getPublicUrl: jest.Mock };

  beforeEach(async () => {
    storageService = { getPublicUrl: jest.fn() };

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: StorageService,
          useValue: storageService,
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });

  describe('getFile', () => {
    it('deve retornar URL pública quando path for informado', async () => {
      storageService.getPublicUrl.mockResolvedValue('https://cdn.test/file.png');

      await expect(appController.getFile('org/file.png')).resolves.toBe(
        'https://cdn.test/file.png',
      );
      expect(storageService.getPublicUrl).toHaveBeenCalledWith('org/file.png');
    });

    it('deve lançar BadRequest quando path estiver vazio', async () => {
      await expect(appController.getFile('')).rejects.toThrow(
        'Query param "path" é obrigatório.',
      );
      expect(storageService.getPublicUrl).not.toHaveBeenCalled();
    });
  });

  describe('getFileByParam', () => {
    it('deve retornar URL pública pelo parâmetro de rota', async () => {
      storageService.getPublicUrl.mockResolvedValue('/storage/file.png');

      await expect(appController.getFileByParam('file.png')).resolves.toBe(
        '/storage/file.png',
      );
    });

    it('deve lançar BadRequest quando path estiver vazio', async () => {
      await expect(appController.getFileByParam('')).rejects.toThrow(
        'Path param "path" é obrigatório.',
      );
    });
  });
});
