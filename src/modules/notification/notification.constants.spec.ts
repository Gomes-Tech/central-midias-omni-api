import {
  buildNotificationRoom,
  isSocketCorsOriginAllowed,
} from './notification.constants';

describe('notification.constants', () => {
  const originalEnv = process.env.NODE_ENV;
  const originalOrigins = process.env.ALLOWED_ORIGINS;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    process.env.ALLOWED_ORIGINS = originalOrigins;
  });

  it('deve montar a sala por usuário e organização', () => {
    expect(buildNotificationRoom('user-1', 'org-1')).toBe(
      'user:user-1:org:org-1',
    );
  });

  it('deve permitir qualquer origin fora de produção quando ALLOWED_ORIGINS estiver vazio', () => {
    process.env.NODE_ENV = 'dev';
    process.env.ALLOWED_ORIGINS = '';

    expect(isSocketCorsOriginAllowed('http://localhost:3000')).toBe(true);
  });
});
