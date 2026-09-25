import { RedisClientLifecycle } from './redis-client.lifecycle';

describe('RedisClientLifecycle', () => {
  it('deve encerrar o cliente Redis no destroy', async () => {
    const redis = {
      quit: jest.fn().mockResolvedValue('OK'),
      disconnect: jest.fn(),
    };

    const lifecycle = new RedisClientLifecycle(redis as never);

    await lifecycle.onModuleDestroy();

    expect(redis.quit).toHaveBeenCalled();
    expect(redis.disconnect).not.toHaveBeenCalled();
  });

  it('deve desconectar quando quit falhar', async () => {
    const redis = {
      quit: jest.fn().mockRejectedValue(new Error('already closed')),
      disconnect: jest.fn(),
    };

    const lifecycle = new RedisClientLifecycle(redis as never);

    await lifecycle.onModuleDestroy();

    expect(redis.disconnect).toHaveBeenCalled();
  });
});
