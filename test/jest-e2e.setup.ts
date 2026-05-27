/**
 * O Jest define NODE_ENV=test por padrão; o ConfigModule da API só aceita dev | prod.
 */
process.env.NODE_ENV = 'dev';

const e2eEnvDefaults: Record<string, string> = {
  JWT_SECRET: 'e2e-jwt-secret-at-least-32-characters-long',
  JWT_EXPIRES: '15m',
  JWT_REFRESH_SECRET: 'e2e-refresh-secret-at-least-32-chars',
  JWT_REFRESH_EXPIRES: '7d',
  SERVER_AUTH_SECRET: 'e2e-server-auth-secret-32chars-min',
  DATABASE_URL: 'postgresql://e2e:e2e@127.0.0.1:5432/e2e',
  AWS_REGION: 'us-east-1',
  S3_BUCKET: 'e2e-bucket',
  SUPABASE_URL: 'https://e2e.supabase.co',
  SUPABASE_KEY: 'e2e-supabase-key',
  SUPABASE_BUCKET: 'e2e-uploads',
};

for (const [key, value] of Object.entries(e2eEnvDefaults)) {
  if (process.env[key] === undefined || process.env[key] === '') {
    process.env[key] = value;
  }
}
