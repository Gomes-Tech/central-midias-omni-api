import { buildPortalMaterialLink } from './build-portal-material-link';

describe('buildPortalMaterialLink', () => {
  const previousFrontendUrl = process.env.FRONTEND_URL;

  afterEach(() => {
    process.env.FRONTEND_URL = previousFrontendUrl;
  });

  it('deve montar a rota do portal em singular e remover barra final da URL', () => {
    process.env.FRONTEND_URL = 'https://app.exemplo.com/';

    expect(buildPortalMaterialLink('material-id')).toBe(
      'https://app.exemplo.com/material/material-id',
    );
  });

  it('deve retornar undefined quando FRONTEND_URL não estiver definido', () => {
    delete process.env.FRONTEND_URL;

    expect(buildPortalMaterialLink('material-id')).toBeUndefined();
  });
});
