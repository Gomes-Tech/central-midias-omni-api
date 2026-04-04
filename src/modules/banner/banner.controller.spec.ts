import { PlatformPermissionGuard } from '@common/guards';
import { Test, TestingModule } from '@nestjs/testing';
import { BannerController } from './banner.controller';
import { CreateBannerUseCase } from './use-cases/create-banner.use-case';
import { DeleteBannerUseCase } from './use-cases/delete-banner.use-case';
import { GetBannerUseCase } from './use-cases/get-banner.use-case';
import { ListBannersUseCase } from './use-cases/list-banners.use-case';
import { UpdateBannerUseCase } from './use-cases/update-banner.use-case';

describe('BannerController', () => {
  let controller: BannerController;
  let createBannerUseCase: { execute: jest.Mock };
  let listBannersUseCase: { execute: jest.Mock };
  let getBannerUseCase: { execute: jest.Mock };
  let updateBannerUseCase: { execute: jest.Mock };
  let deleteBannerUseCase: { execute: jest.Mock };

  beforeEach(async () => {
    createBannerUseCase = { execute: jest.fn() };
    listBannersUseCase = { execute: jest.fn() };
    getBannerUseCase = { execute: jest.fn() };
    updateBannerUseCase = { execute: jest.fn() };
    deleteBannerUseCase = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BannerController],
      providers: [
        { provide: CreateBannerUseCase, useValue: createBannerUseCase },
        { provide: ListBannersUseCase, useValue: listBannersUseCase },
        { provide: GetBannerUseCase, useValue: getBannerUseCase },
        { provide: UpdateBannerUseCase, useValue: updateBannerUseCase },
        { provide: DeleteBannerUseCase, useValue: deleteBannerUseCase },
      ],
    })
      .overrideGuard(PlatformPermissionGuard)
      .useValue({ canActivate: jest.fn().mockResolvedValue(true) })
      .compile();

    controller = module.get<BannerController>(BannerController);
  });

  describe('list', () => {
    it('deve delegar ao ListBannersUseCase com data opcional', async () => {
      listBannersUseCase.execute.mockResolvedValue([]);

      await controller.list('org-1', '2024-01-01');

      expect(listBannersUseCase.execute).toHaveBeenCalledWith(
        'org-1',
        '2024-01-01',
      );
    });

    it('deve omitir referenceDate quando não informado', async () => {
      listBannersUseCase.execute.mockResolvedValue([]);

      await controller.list('org-1');

      expect(listBannersUseCase.execute).toHaveBeenCalledWith(
        'org-1',
        undefined,
      );
    });
  });

  describe('getById', () => {
    it('deve delegar ao GetBannerUseCase', async () => {
      getBannerUseCase.execute.mockResolvedValue({ id: 'b1' });

      await controller.getById('b1', 'org-1');

      expect(getBannerUseCase.execute).toHaveBeenCalledWith('b1', 'org-1');
    });
  });

  describe('create', () => {
    it('deve mapear arquivos e delegar ao CreateBannerUseCase', async () => {
      const dto = {
        name: 'Banner',
        order: 0,
      } as Parameters<BannerController['create']>[1];
      const mobile = { fieldname: 'mobileImage' } as Express.Multer.File;
      const desktop = { fieldname: 'desktopImage' } as Express.Multer.File;
      const files = {
        mobileImage: [mobile],
        desktopImage: [desktop],
      };

      createBannerUseCase.execute.mockResolvedValue(undefined);

      await controller.create('org-1', dto, 'uid', files);

      expect(createBannerUseCase.execute).toHaveBeenCalledWith(
        'org-1',
        dto,
        'uid',
        { mobile, desktop },
      );
    });

    it('deve enviar mobile e desktop undefined quando não houver arquivos', async () => {
      const dto = { name: 'B', order: 1 } as Parameters<
        BannerController['create']
      >[1];
      createBannerUseCase.execute.mockResolvedValue(undefined);

      await controller.create('org-1', dto, 'uid', undefined);

      expect(createBannerUseCase.execute).toHaveBeenCalledWith(
        'org-1',
        dto,
        'uid',
        { mobile: undefined, desktop: undefined },
      );
    });
  });

  describe('update', () => {
    it('deve delegar ao UpdateBannerUseCase com files brutos', async () => {
      const dto = { name: 'Atualizado' } as Parameters<
        BannerController['update']
      >[2];
      const files = { mobileImage: [] as Express.Multer.File[] };
      updateBannerUseCase.execute.mockResolvedValue(undefined);

      await controller.update('b1', 'org-1', dto, 'uid', files);

      expect(updateBannerUseCase.execute).toHaveBeenCalledWith(
        'b1',
        'org-1',
        dto,
        'uid',
        files,
      );
    });
  });

  describe('delete', () => {
    it('deve delegar ao DeleteBannerUseCase', async () => {
      deleteBannerUseCase.execute.mockResolvedValue(undefined);

      await controller.delete('b1', 'org-1', 'uid');

      expect(deleteBannerUseCase.execute).toHaveBeenCalledWith(
        'b1',
        'org-1',
        'uid',
      );
    });
  });
});
