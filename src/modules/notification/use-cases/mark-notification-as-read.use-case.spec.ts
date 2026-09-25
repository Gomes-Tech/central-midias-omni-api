import { NotFoundException } from '@common/filters';
import { NotificationRepository } from '../repository';
import { MarkNotificationAsReadUseCase } from './mark-notification-as-read.use-case';

describe('MarkNotificationAsReadUseCase', () => {
  let repository: { findOwnedById: jest.Mock; markAsRead: jest.Mock };
  let useCase: MarkNotificationAsReadUseCase;

  beforeEach(() => {
    repository = {
      findOwnedById: jest.fn(),
      markAsRead: jest.fn(),
    };
    useCase = new MarkNotificationAsReadUseCase(
      repository as unknown as NotificationRepository,
    );
  });

  it('deve marcar como lida quando a notificação existir e for do usuário', async () => {
    repository.findOwnedById.mockResolvedValue({ id: 'n1', readAt: null });
    repository.markAsRead.mockResolvedValue(undefined);

    await useCase.execute('n1', 'user-1', 'org-1');

    expect(repository.markAsRead).toHaveBeenCalledWith('n1', 'user-1', 'org-1');
  });

  it('não deve atualizar quando já estiver lida', async () => {
    repository.findOwnedById.mockResolvedValue({
      id: 'n1',
      readAt: new Date(),
    });

    await useCase.execute('n1', 'user-1', 'org-1');

    expect(repository.markAsRead).not.toHaveBeenCalled();
  });

  it('deve lançar NotFound quando a notificação não for do usuário/org', async () => {
    repository.findOwnedById.mockResolvedValue(null);

    await expect(
      useCase.execute('n1', 'user-1', 'org-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
