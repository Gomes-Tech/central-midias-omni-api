import { Test, TestingModule } from '@nestjs/testing';
import { NotificationController } from './notification.controller';
import {
  CountUnreadNotificationsUseCase,
  FindMyNotificationsUseCase,
  MarkAllNotificationsAsReadUseCase,
  MarkNotificationAsReadUseCase,
} from './use-cases';

describe('NotificationController', () => {
  let controller: NotificationController;
  let findMyNotificationsUseCase: { execute: jest.Mock };
  let countUnreadNotificationsUseCase: { execute: jest.Mock };
  let markNotificationAsReadUseCase: { execute: jest.Mock };
  let markAllNotificationsAsReadUseCase: { execute: jest.Mock };

  beforeEach(async () => {
    findMyNotificationsUseCase = { execute: jest.fn() };
    countUnreadNotificationsUseCase = { execute: jest.fn() };
    markNotificationAsReadUseCase = { execute: jest.fn() };
    markAllNotificationsAsReadUseCase = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationController],
      providers: [
        {
          provide: FindMyNotificationsUseCase,
          useValue: findMyNotificationsUseCase,
        },
        {
          provide: CountUnreadNotificationsUseCase,
          useValue: countUnreadNotificationsUseCase,
        },
        {
          provide: MarkNotificationAsReadUseCase,
          useValue: markNotificationAsReadUseCase,
        },
        {
          provide: MarkAllNotificationsAsReadUseCase,
          useValue: markAllNotificationsAsReadUseCase,
        },
      ],
    }).compile();

    controller = module.get<NotificationController>(NotificationController);
  });

  it('deve listar notificações do usuário na org', async () => {
    const payload = { data: [], total: 0, page: 1, totalPages: 0 };
    findMyNotificationsUseCase.execute.mockResolvedValue(payload);

    const result = await controller.list('user-1', 'org-1', { page: 1 });

    expect(result).toBe(payload);
    expect(findMyNotificationsUseCase.execute).toHaveBeenCalledWith(
      'user-1',
      'org-1',
      { page: 1 },
    );
  });

  it('deve devolver o count de não lidas', async () => {
    countUnreadNotificationsUseCase.execute.mockResolvedValue({ count: 4 });

    await expect(controller.unreadCount('user-1', 'org-1')).resolves.toEqual({
      count: 4,
    });
  });

  it('deve marcar uma notificação como lida', async () => {
    markNotificationAsReadUseCase.execute.mockResolvedValue(undefined);

    await controller.markAsRead('n1', 'user-1', 'org-1');

    expect(markNotificationAsReadUseCase.execute).toHaveBeenCalledWith(
      'n1',
      'user-1',
      'org-1',
    );
  });

  it('deve marcar todas como lidas', async () => {
    markAllNotificationsAsReadUseCase.execute.mockResolvedValue({
      updated: 2,
    });

    await expect(
      controller.markAllAsRead('user-1', 'org-1'),
    ).resolves.toEqual({ updated: 2 });
  });
});
