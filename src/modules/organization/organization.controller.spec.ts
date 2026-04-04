import { PlatformPermissionGuard } from '@common/guards';
import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationController } from './organization.controller';
import {
  CreateOrganizationUseCase,
  DeleteOrganizationUseCase,
  FindAllOrganizationsUseCase,
  FindOrganizationByIdUseCase,
  UpdateOrganizationUseCase,
} from './use-cases';

describe('OrganizationController', () => {
  let controller: OrganizationController;
  let createOrganizationUseCase: { execute: jest.Mock };
  let findAllOrganizationsUseCase: { execute: jest.Mock };
  let findOrganizationByIdUseCase: { execute: jest.Mock };
  let updateOrganizationUseCase: { execute: jest.Mock };
  let deleteOrganizationUseCase: { execute: jest.Mock };

  beforeEach(async () => {
    createOrganizationUseCase = { execute: jest.fn() };
    findAllOrganizationsUseCase = { execute: jest.fn() };
    findOrganizationByIdUseCase = { execute: jest.fn() };
    updateOrganizationUseCase = { execute: jest.fn() };
    deleteOrganizationUseCase = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrganizationController],
      providers: [
        {
          provide: CreateOrganizationUseCase,
          useValue: createOrganizationUseCase,
        },
        {
          provide: FindAllOrganizationsUseCase,
          useValue: findAllOrganizationsUseCase,
        },
        {
          provide: FindOrganizationByIdUseCase,
          useValue: findOrganizationByIdUseCase,
        },
        {
          provide: UpdateOrganizationUseCase,
          useValue: updateOrganizationUseCase,
        },
        {
          provide: DeleteOrganizationUseCase,
          useValue: deleteOrganizationUseCase,
        },
      ],
    })
      .overrideGuard(PlatformPermissionGuard)
      .useValue({ canActivate: jest.fn().mockResolvedValue(true) })
      .compile();

    controller = module.get<OrganizationController>(OrganizationController);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getList', () => {
    it('deve delegar ao FindAllOrganizationsUseCase', async () => {
      findAllOrganizationsUseCase.execute.mockResolvedValue([]);

      await controller.getList();

      expect(findAllOrganizationsUseCase.execute).toHaveBeenCalledWith();
    });
  });

  describe('findById', () => {
    it('deve delegar ao FindOrganizationByIdUseCase', async () => {
      findOrganizationByIdUseCase.execute.mockResolvedValue({ id: 'o1' });

      await controller.findById('o1');

      expect(findOrganizationByIdUseCase.execute).toHaveBeenCalledWith('o1');
    });
  });

  describe('create', () => {
    it('deve delegar ao CreateOrganizationUseCase com arquivo opcional', async () => {
      const dto = { name: 'Org', slug: 'org' } as Parameters<
        OrganizationController['create']
      >[0];
      const file = { filename: 'logo.png' } as Express.Multer.File;
      createOrganizationUseCase.execute.mockResolvedValue({ id: 'o1' });

      await controller.create(dto, 'uid', file);

      expect(createOrganizationUseCase.execute).toHaveBeenCalledWith(
        dto,
        'uid',
        file,
      );
    });
  });

  describe('update', () => {
    it('deve delegar ao UpdateOrganizationUseCase', async () => {
      const dto = { name: 'Nova' } as Parameters<
        OrganizationController['update']
      >[1];
      updateOrganizationUseCase.execute.mockResolvedValue({});

      await controller.update('o1', dto, 'uid');

      expect(updateOrganizationUseCase.execute).toHaveBeenCalledWith(
        'o1',
        dto,
        'uid',
        undefined,
      );
    });
  });

  describe('delete', () => {
    it('deve delegar ao DeleteOrganizationUseCase', async () => {
      deleteOrganizationUseCase.execute.mockResolvedValue(undefined);

      await controller.delete('o1');

      expect(deleteOrganizationUseCase.execute).toHaveBeenCalledWith('o1');
    });
  });
});
