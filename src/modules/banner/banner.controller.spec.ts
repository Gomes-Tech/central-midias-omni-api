import { PlatformPermissionGuard } from '@common/guards';
import { Test, TestingModule } from '@nestjs/testing';
import { BannerController } from './banner.controller';
import { CreateBannerUseCase } from './use-cases/create-banner.use-case';
import { DeleteBannerUseCase } from './use-cases/delete-banner.use-case';
import { FindAllBannersUseCase } from './use-cases/find-all-banners.use-case';
import { GetBannerUseCase } from './use-cases/get-banner-by-id.use-case';
import { FindListBannersUseCase } from './use-cases/list-banner.use-case';
import { UpdateBannerUseCase } from './use-cases/update-banner.use-case';

describe('BannerController', () => {
  let controller: BannerController;
  let createBannerUseCase: { execute: jest.Mock };
  let findAllBannersUseCase: { execute: jest.Mock };
  let findListBannersUseCase: { execute: jest.Mock };
  let getBannerUseCase: { execute: jest.Mock };
  let updateBannerUseCase: { execute: jest.Mock };
  let deleteBannerUseCase: { execute: jest.Mock };

  beforeEach(async () => {
    createBannerUseCase = { execute: jest.fn() };
    findAllBannersUseCase = { execute: jest.fn() };
    findListBannersUseCase = { execute: jest.fn() };
    getBannerUseCase = { execute: jest.fn() };
    updateBannerUseCase = { execute: jest.fn() };
    deleteBannerUseCase = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BannerController],
      providers: [
        { provide: CreateBannerUseCase, useValue: createBannerUseCase },
        { provide: FindAllBannersUseCase, useValue: findAllBannersUseCase },
        { provide: FindListBannersUseCase, useValue: findListBannersUseCase },
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
    it('deve delegar ao FindAllBannersUseCase com os filtros da query', async () => {
      const filters = { page: 1, limit: 25, searchTerm: 'promo' };

      findAllBannersUseCase.execute.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        totalPages: 0,
      });

      await controller.list('org-1', filters);

      expect(findAllBannersUseCase.execute).toHaveBeenCalledWith(
        'org-1',
        filters,
      );
    });

    it('deve delegar com filtros vazios quando não informados', async () => {
      findAllBannersUseCase.execute.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        totalPages: 0,
      });

      await controller.list('org-1', {});

      expect(findAllBannersUseCase.execute).toHaveBeenCalledWith('org-1', {});
    });

    it('deve usar filtros padrão quando query não for passada', async () => {
      findAllBannersUseCase.execute.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        totalPages: 0,
      });

      await controller.list('org-1');

      expect(findAllBannersUseCase.execute).toHaveBeenCalledWith('org-1', {});
    });
  });

  describe('listWeb', () => {
    it('deve delegar ao FindListBannersUseCase', async () => {
      const payload = [{ id: 'b1', name: 'Banner' }];
      findListBannersUseCase.execute.mockResolvedValue(payload);

      const result = await controller.listWeb('org-1');

      expect(result).toBe(payload);
      expect(findListBannersUseCase.execute).toHaveBeenCalledWith('org-1');
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
      const files = [mobile, desktop];

      createBannerUseCase.execute.mockResolvedValue(undefined);

      await controller.create('org-1', dto, 'uid', files);

      expect(createBannerUseCase.execute).toHaveBeenCalledWith(
        'org-1',
        dto,
        'uid',
        { mobile, desktop },
      );
    });

    it('deve extrair arquivo único quando campo não for array', async () => {
      const dto = { name: 'Banner', order: 0 } as Parameters<
        BannerController['create']
      >[1];
      const mobile = { fieldname: 'mobileImage' } as Express.Multer.File;
      const files = { mobileImage: mobile };

      createBannerUseCase.execute.mockResolvedValue(undefined);

      await controller.create('org-1', dto, 'uid', files);

      expect(createBannerUseCase.execute).toHaveBeenCalledWith(
        'org-1',
        dto,
        'uid',
        { mobile, desktop: undefined },
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

    it('deve aceitar arquivos agrupados por nome do campo', async () => {
      const dto = { name: 'Banner', order: 0 } as Parameters<
        BannerController['create']
      >[1];
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
        { desktopImage: undefined, mobileImage: undefined },
      );
    });

    it('deve mapear arquivos vindos do middleware multipart global', async () => {
      const dto = { name: 'Atualizado' } as Parameters<
        BannerController['update']
      >[2];
      const mobileImage = {
        fieldname: 'mobileImage',
      } as Express.Multer.File;
      const desktopImage = {
        fieldname: 'desktopImage',
      } as Express.Multer.File;
      updateBannerUseCase.execute.mockResolvedValue(undefined);

      await controller.update('b1', 'org-1', dto, 'uid', [
        mobileImage,
        desktopImage,
      ]);

      expect(updateBannerUseCase.execute).toHaveBeenCalledWith(
        'b1',
        'org-1',
        dto,
        'uid',
        { desktopImage, mobileImage },
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
