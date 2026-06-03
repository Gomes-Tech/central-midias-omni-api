import { INestApplication } from '@nestjs/common';
import { E2E_IDS } from '../fixtures/e2e-seed';
import { createE2eApp } from '../helpers/create-e2e-app';
import { e2eAuthHeaders, e2eRequest, e2eSignIn } from '../helpers/e2e-http';

describe('CategoryRoleAccess (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    app = await createE2eApp();
    ({ accessToken } = await e2eSignIn(app));
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/category-role-accesses deve listar acessos', async () => {
    const response = await e2eRequest(app)
      .get('/api/category-role-accesses')
      .set(e2eAuthHeaders(accessToken))
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
  });

  it('GET /api/category-role-accesses/category/:categoryId/roles deve listar papéis', async () => {
    const response = await e2eRequest(app)
      .get(`/api/category-role-accesses/category/${E2E_IDS.categoryId}/roles`)
      .set(e2eAuthHeaders(accessToken))
      .expect(200);

    expect(response.body).toEqual({
      isUnrestricted: false,
      roles: [
        {
          id: E2E_IDS.roleId,
          name: 'ADMIN',
          label: 'Administrador',
        },
      ],
    });
  });
});
