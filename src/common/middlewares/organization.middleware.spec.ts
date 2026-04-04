import { PrismaService } from '@infrastructure/prisma';
import { NotFoundException } from '@nestjs/common';
import { OrganizationMiddleware } from './organization.middleware';

describe('OrganizationMiddleware', () => {
  let middleware: OrganizationMiddleware;
  let findUnique: jest.Mock;

  beforeEach(() => {
    findUnique = jest.fn();
    const prisma = {
      organization: { findUnique },
    } as unknown as PrismaService;
    middleware = new OrganizationMiddleware(prisma);
  });

  it('deve lançar BadRequestException quando x-organization-id estiver ausente', async () => {
    const req = { headers: {} };
    const next = jest.fn();

    await expect(middleware.use(req, {}, next)).rejects.toMatchObject({
      response: expect.objectContaining({
        message: 'Permissão insuficiente.',
      }),
    });
    expect(findUnique).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('deve lançar NotFoundException quando a organização não existir ou estiver inativa', async () => {
    findUnique.mockResolvedValue(null);
    const req = { headers: { 'x-organization-id': 'org-1' } };
    const next = jest.fn();

    await expect(middleware.use(req, {}, next)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: 'org-1', isActive: true, isDeleted: false },
      select: { id: true },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('deve chamar next quando a organização for encontrada', async () => {
    findUnique.mockResolvedValue({ id: 'org-1' });
    const req = { headers: { 'x-organization-id': 'org-1' } };
    const next = jest.fn();

    await middleware.use(req, {}, next);

    expect(next).toHaveBeenCalledTimes(1);
  });
});
