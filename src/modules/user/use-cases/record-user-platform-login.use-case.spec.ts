import { RecordUserPlatformLoginUseCase } from './record-user-platform-login.use-case';

describe('RecordUserPlatformLoginUseCase', () => {
  let userRepository: {
    upsertPlatformLogin: jest.Mock;
    updatePlatformLoginIfDifferentDay: jest.Mock;
    registerPlatformLoginEvent: jest.Mock;
  };
  let useCase: RecordUserPlatformLoginUseCase;

  beforeEach(() => {
    userRepository = {
      upsertPlatformLogin: jest.fn().mockResolvedValue(undefined),
      updatePlatformLoginIfDifferentDay: jest.fn().mockResolvedValue(false),
      registerPlatformLoginEvent: jest.fn().mockResolvedValue(undefined),
    };

    useCase = new RecordUserPlatformLoginUseCase(userRepository as never);
  });

  it('deve fazer upsert no sign-in', async () => {
    await useCase.execute('user-1', 'sign-in');

    expect(userRepository.upsertPlatformLogin).toHaveBeenCalledWith('user-1');
    expect(userRepository.registerPlatformLoginEvent).toHaveBeenCalledWith(
      'user-1',
    );
    expect(userRepository.updatePlatformLoginIfDifferentDay).not.toHaveBeenCalled();
  });

  it('deve registrar evento apenas em dia diferente no refresh', async () => {
    userRepository.updatePlatformLoginIfDifferentDay.mockResolvedValue(true);

    await useCase.execute('user-1', 'refresh');

    expect(userRepository.updatePlatformLoginIfDifferentDay).toHaveBeenCalledWith(
      'user-1',
    );
    expect(userRepository.registerPlatformLoginEvent).toHaveBeenCalledWith(
      'user-1',
    );
    expect(userRepository.upsertPlatformLogin).not.toHaveBeenCalled();
  });

  it('não deve registrar evento no refresh quando for o mesmo dia', async () => {
    await useCase.execute('user-1', 'refresh');

    expect(userRepository.registerPlatformLoginEvent).not.toHaveBeenCalled();
  });

  it('não deve propagar erro do repositório', async () => {
    userRepository.upsertPlatformLogin.mockRejectedValue(new Error('db down'));

    await expect(useCase.execute('user-1', 'sign-in')).resolves.toBeUndefined();
  });
});
