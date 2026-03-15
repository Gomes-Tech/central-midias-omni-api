export const getEnv = () => ({
  api: {
    env: process.env.NODE_ENV as 'prod' | 'dev',
    port: Number(process.env.PORT || '4000'),
    apiKey: process.env.SERVER_AUTH_SECRET,
    allowedOrigins: process.env.ALLOWED_ORIGINS,
  },
});
