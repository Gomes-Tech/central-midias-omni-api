import { LoggerService } from './logger.service';
import { LogRepository } from './log.repository';

describe('LoggerService', () => {
  let repository: jest.Mocked<Pick<LogRepository, 'create'>>;
  let service: LoggerService;
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    repository = { create: jest.fn().mockResolvedValue(undefined) };
    service = new LoggerService(repository as unknown as LogRepository);
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    jest.restoreAllMocks();
  });

  it('info deve persistir e não logar console em prod', async () => {
    process.env.NODE_ENV = 'prod';
    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    await service.info('msg', { requestId: 'r1' });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'INFO',
        message: 'msg',
        requestId: 'r1',
      }),
    );
    expect(logSpy).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it('warn e error devem persistir em dev e escrever no console', async () => {
    process.env.NODE_ENV = 'dev';
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    const errSpy = jest.spyOn(console, 'error').mockImplementation();

    await service.warn('w');
    await service.error('e');

    expect(repository.create).toHaveBeenCalledTimes(2);
    expect(warnSpy).toHaveBeenCalled();
    expect(errSpy).toHaveBeenCalled();
  });

  it('deve truncar mensagem acima de 2000 caracteres', async () => {
    process.env.NODE_ENV = 'prod';
    const long = 'x'.repeat(2010);
    await service.info(long);

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'x'.repeat(2000),
      }),
    );
  });

  it('deve enviar contexto extra como JSON', async () => {
    process.env.NODE_ENV = 'prod';
    await service.info('m', { requestId: 'r', foo: 'bar' });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        context: { foo: 'bar' },
      }),
    );
  });

  it('não deve lançar se persistir falhar', async () => {
    process.env.NODE_ENV = 'dev';
    repository.create.mockRejectedValue(new Error('db'));
    const errSpy = jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'log').mockImplementation();

    await expect(service.info('x')).resolves.toBeUndefined();
    expect(errSpy).toHaveBeenCalled();
  });
});
