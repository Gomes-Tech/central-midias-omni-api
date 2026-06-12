import { PlatformPermissionGuard } from '@common/guards';
import { Test, TestingModule } from '@nestjs/testing';
import { SocialHighlightController } from './social-highlight.controller';
import { CreateSocialHighlightUseCase } from './use-cases/create-social-highlight.use-case';
import { DeleteSocialHighlightUseCase } from './use-cases/delete-social-highlight.use-case';
import { FindAllSocialHighlightsUseCase } from './use-cases/find-all-social-highlights.use-case';
import { GetSocialHighlightUseCase } from './use-cases/get-social-highlight-by-id.use-case';
import { FindListSocialHighlightsUseCase } from './use-cases/list-social-highlight.use-case';
import { UpdateSocialHighlightUseCase } from './use-cases/update-social-highlight.use-case';

describe('SocialHighlightController', () => {
  let controller: SocialHighlightController;
  let createSocialHighlightUseCase: { execute: jest.Mock };
  let findAllSocialHighlightsUseCase: { execute: jest.Mock };
  let findListSocialHighlightsUseCase: { execute: jest.Mock };
  let getSocialHighlightUseCase: { execute: jest.Mock };
  let updateSocialHighlightUseCase: { execute: jest.Mock };
  let deleteSocialHighlightUseCase: { execute: jest.Mock };

  beforeEach(async () => {
    createSocialHighlightUseCase = { execute: jest.fn() };
    findAllSocialHighlightsUseCase = { execute: jest.fn() };
    findListSocialHighlightsUseCase = { execute: jest.fn() };
    getSocialHighlightUseCase = { execute: jest.fn() };
    updateSocialHighlightUseCase = { execute: jest.fn() };
    deleteSocialHighlightUseCase = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SocialHighlightController],
      providers: [
        { provide: CreateSocialHighlightUseCase, useValue: createSocialHighlightUseCase },
        { provide: FindAllSocialHighlightsUseCase, useValue: findAllSocialHighlightsUseCase },
        { provide: FindListSocialHighlightsUseCase, useValue: findListSocialHighlightsUseCase },
        { provide: GetSocialHighlightUseCase, useValue: getSocialHighlightUseCase },
        { provide: UpdateSocialHighlightUseCase, useValue: updateSocialHighlightUseCase },
        { provide: DeleteSocialHighlightUseCase, useValue: deleteSocialHighlightUseCase },
      ],
    })
      .overrideGuard(PlatformPermissionGuard)
      .useValue({ canActivate: jest.fn().mockResolvedValue(true) })
      .compile();

    controller = module.get<SocialHighlightController>(SocialHighlightController);
  });

  describe('list', () => {
    it('deve delegar ao FindAllSocialHighlightsUseCase com os filtros da query', async () => {
      const filters = { page: 1, limit: 25, searchTerm: 'promo' };

      findAllSocialHighlightsUseCase.execute.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        totalPages: 0,
      });

      await controller.list('org-1', filters);

      expect(findAllSocialHighlightsUseCase.execute).toHaveBeenCalledWith(
        'org-1',
        filters,
      );
    });

    it('deve delegar com filtros vazios quando não informados', async () => {
      findAllSocialHighlightsUseCase.execute.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        totalPages: 0,
      });

      await controller.list('org-1', {});

      expect(findAllSocialHighlightsUseCase.execute).toHaveBeenCalledWith('org-1', {});
    });

    it('deve usar filtros padrão quando query não for passada', async () => {
      findAllSocialHighlightsUseCase.execute.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        totalPages: 0,
      });

      await controller.list('org-1');

      expect(findAllSocialHighlightsUseCase.execute).toHaveBeenCalledWith('org-1', {});
    });
  });

  describe('listWeb', () => {
    it('deve delegar ao FindListSocialHighlightsUseCase', async () => {
      const payload = [{ id: 'b1', name: 'Banner' }];
      findListSocialHighlightsUseCase.execute.mockResolvedValue(payload);

      const result = await controller.listWeb('org-1');

      expect(result).toBe(payload);
      expect(findListSocialHighlightsUseCase.execute).toHaveBeenCalledWith('org-1');
    });
  });

  describe('getById', () => {
    it('deve delegar ao GetSocialHighlightUseCase', async () => {
      getSocialHighlightUseCase.execute.mockResolvedValue({ id: 'b1' });

      await controller.getById('b1', 'org-1');

      expect(getSocialHighlightUseCase.execute).toHaveBeenCalledWith('b1', 'org-1');
    });
  });

  describe('create', () => {
    it('deve mapear arquivos e delegar ao CreateSocialHighlightUseCase', async () => {
      const dto = {
        name: 'Banner',
        order: 0,
      } as Parameters<SocialHighlightController['create']>[1];
      const mobile = { fieldname: 'mobileImage' } as Express.Multer.File;
      const desktop = { fieldname: 'desktopImage' } as Express.Multer.File;
      const files = [mobile, desktop];

      createSocialHighlightUseCase.execute.mockResolvedValue(undefined);

      await controller.create('org-1', dto, 'uid', files);

      expect(createSocialHighlightUseCase.execute).toHaveBeenCalledWith(
        'org-1',
        dto,
        'uid',
        { mobile, desktop },
      );
    });

    it('deve extrair arquivo único quando campo não for array', async () => {
      const dto = { name: 'Banner', order: 0 } as Parameters<
        SocialHighlightController['create']
      >[1];
      const mobile = { fieldname: 'mobileImage' } as Express.Multer.File;
      const files = { mobileImage: mobile };

      createSocialHighlightUseCase.execute.mockResolvedValue(undefined);

      await controller.create('org-1', dto, 'uid', files);

      expect(createSocialHighlightUseCase.execute).toHaveBeenCalledWith(
        'org-1',
        dto,
        'uid',
        { mobile, desktop: undefined },
      );
    });

    it('deve enviar mobile e desktop undefined quando não houver arquivos', async () => {
      const dto = { name: 'B', order: 1 } as Parameters<
        SocialHighlightController['create']
      >[1];
      createSocialHighlightUseCase.execute.mockResolvedValue(undefined);

      await controller.create('org-1', dto, 'uid', undefined);

      expect(createSocialHighlightUseCase.execute).toHaveBeenCalledWith(
        'org-1',
        dto,
        'uid',
        { mobile: undefined, desktop: undefined },
      );
    });

    it('deve aceitar arquivos agrupados por nome do campo', async () => {
      const dto = { name: 'Banner', order: 0 } as Parameters<
        SocialHighlightController['create']
      >[1];
      const mobile = { fieldname: 'mobileImage' } as Express.Multer.File;
      const desktop = { fieldname: 'desktopImage' } as Express.Multer.File;
      const files = {
        mobileImage: [mobile],
        desktopImage: [desktop],
      };

      createSocialHighlightUseCase.execute.mockResolvedValue(undefined);

      await controller.create('org-1', dto, 'uid', files);

      expect(createSocialHighlightUseCase.execute).toHaveBeenCalledWith(
        'org-1',
        dto,
        'uid',
        { mobile, desktop },
      );
    });
  });

  describe('update', () => {
    it('deve delegar ao UpdateSocialHighlightUseCase com files brutos', async () => {
      const dto = { name: 'Atualizado' } as Parameters<
        SocialHighlightController['update']
      >[2];
      const files = { mobileImage: [] as Express.Multer.File[] };
      updateSocialHighlightUseCase.execute.mockResolvedValue(undefined);

      await controller.update('b1', 'org-1', dto, 'uid', files);

      expect(updateSocialHighlightUseCase.execute).toHaveBeenCalledWith(
        'b1',
        'org-1',
        dto,
        'uid',
        { desktopImage: undefined, mobileImage: undefined },
      );
    });

    it('deve mapear arquivos vindos do middleware multipart global', async () => {
      const dto = { name: 'Atualizado' } as Parameters<
        SocialHighlightController['update']
      >[2];
      const mobileImage = {
        fieldname: 'mobileImage',
      } as Express.Multer.File;
      const desktopImage = {
        fieldname: 'desktopImage',
      } as Express.Multer.File;
      updateSocialHighlightUseCase.execute.mockResolvedValue(undefined);

      await controller.update('b1', 'org-1', dto, 'uid', [
        mobileImage,
        desktopImage,
      ]);

      expect(updateSocialHighlightUseCase.execute).toHaveBeenCalledWith(
        'b1',
        'org-1',
        dto,
        'uid',
        { desktopImage, mobileImage },
      );
    });
  });

  describe('delete', () => {
    it('deve delegar ao DeleteSocialHighlightUseCase', async () => {
      deleteSocialHighlightUseCase.execute.mockResolvedValue(undefined);

      await controller.delete('b1', 'org-1', 'uid');

      expect(deleteSocialHighlightUseCase.execute).toHaveBeenCalledWith(
        'b1',
        'org-1',
        'uid',
      );
    });
  });
});
