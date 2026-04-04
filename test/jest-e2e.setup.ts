/**
 * O Jest define NODE_ENV=test por padrão; o ConfigModule da API só aceita dev | prod.
 * Sem isso o bootstrap do AppModule falha nos testes e2e.
 */
process.env.NODE_ENV = 'dev';

/**
 * Joi do ConfigModule exige estas variáveis; nos e2e o Prisma é mockado (sem conexão real).
 * Valores só aplicam se ainda não estiverem definidos (ex.: CI sem .env).
 */
const e2eEnvDefaults: Record<string, string> = {
  JWT_SECRET: 'e2e-jwt-secret-at-least-32-characters-long',
  JWT_EXPIRES: '15m',
  JWT_REFRESH_SECRET: 'e2e-refresh-secret-at-least-32-chars',
  JWT_REFRESH_EXPIRES: '7d',
  SERVER_AUTH_SECRET: 'e2e-server-auth-secret-32chars-min',
  DATABASE_URL: 'postgresql://e2e:e2e@127.0.0.1:5432/e2e',
};
for (const [key, value] of Object.entries(e2eEnvDefaults)) {
  if (process.env[key] === undefined || process.env[key] === '') {
    process.env[key] = value;
  }
}
