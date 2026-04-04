import { getEnv } from './constants';

describe('getEnv', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('deve mapear variáveis de ambiente da API', () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'prod',
      PORT: '8080',
      SERVER_AUTH_SECRET: 'secret',
      ALLOWED_ORIGINS: 'https://a.com,https://b.com',
    };

    expect(getEnv()).toEqual({
      api: {
        env: 'prod',
        port: 8080,
        apiKey: 'secret',
        allowedOrigins: 'https://a.com,https://b.com',
      },
    });
  });

  it('deve usar porta 4000 quando PORT não estiver definida', () => {
    process.env = { ...originalEnv };
    delete process.env.PORT;

    expect(getEnv().api.port).toBe(4000);
  });
});
