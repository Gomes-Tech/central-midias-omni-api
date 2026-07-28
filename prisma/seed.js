const { randomUUID } = require('node:crypto');
const { Action, PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

const ALL_ACTIONS = [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE];

const MODULES = [
  { name: 'organizations', label: 'Organizações' },
  { name: 'roles', label: 'Perfis' },
  { name: 'users', label: 'Usuários' },
  { name: 'members', label: 'Membros' },
  { name: 'categories', label: 'Categorias' },
  { name: 'banners', label: 'Banners' },
  { name: 'social-highlights', label: 'Ta na Rede' },
  { name: 'materials', label: 'Materiais' },
  { name: 'tags', label: 'Tags' },
  { name: 'reports', label: 'Relatórios' },
  { name: 'faqs', label: 'FAQ' },
  { name: 'calendar', label: 'Calendário' },
  { name: 'assets', label: 'Assets' },
];

async function main() {
  const alreadySeeded = await prisma.seedStatus.findUnique({
    where: { id: 'main-seed' },
  });

  const hashedPassword = alreadySeeded
    ? null
    : await bcrypt.hash('V9!rK#4pT@7zL$2qX8mF', 14);

  const permissionsCreated = await prisma.$transaction(
    async (tx) => {
      await tx.module.createMany({
        data: MODULES.map((module) => ({ id: randomUUID(), ...module })),
        skipDuplicates: true,
      });

      const modules = await tx.module.findMany({
        where: { name: { in: MODULES.map((module) => module.name) } },
      });

      const adminRole = await tx.role.upsert({
        where: { name: 'ADMIN' },
        update: {},
        create: {
          id: randomUUID(),
          name: 'ADMIN',
          label: 'Administrador',
          isSystem: true,
          canAccessBackoffice: true,
          canHaveSubordinates: false,
        },
      });

      const result = await tx.rolePermission.createMany({
        data: modules.flatMap((module) =>
          ALL_ACTIONS.map((action) => ({
            id: randomUUID(),
            roleId: adminRole.id,
            moduleId: module.id,
            action,
          })),
        ),
        skipDuplicates: true,
      });

      if (!alreadySeeded && hashedPassword) {
        await tx.user.upsert({
          where: { email: 'admin@admin.com' },
          update: {},
          create: {
            id: randomUUID(),
            name: 'Admin',
            email: 'admin@admin.com',
            password: hashedPassword,
            taxIdentifier: '93978425017',
            isActive: true,
            isFirstAccess: false,
            globalRole: {
              connect: {
                id: adminRole.id,
              },
            },
          },
        });

        await tx.seedStatus.create({
          data: { id: 'main-seed', executedAt: new Date() },
        });
      }

      return result.count;
    },
    { timeout: 30_000 },
  );

  console.log(
    alreadySeeded
      ? `Seed já executado. Sincronização concluída: ${permissionsCreated} permissão(ões) adicionada(s) ao ADMIN.`
      : 'Seed concluído com sucesso!',
  );
  console.log(
    'Nota: rotas do backoffice exigem um Member (usuário + organização + role). Sem organização seedada, o admin ainda não passa no PlatformPermissionGuard.',
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
