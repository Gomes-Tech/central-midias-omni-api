const { PrismaClient } = require('@prisma/client');
const {
  resolveSeedUserId,
  seedHolidaysForOrganization,
} = require('./lib/brazilian-holidays');

const prisma = new PrismaClient();

async function main() {
  const organizations = await prisma.organization.findMany({
    where: {
      isDeleted: false,
    },
    select: {
      id: true,
      name: true,
    },
    orderBy: [{ name: 'asc' }],
  });

  if (organizations.length === 0) {
    console.log('Nenhuma organização encontrada para sincronizar feriados.');
    return;
  }

  const createdByUserId = await resolveSeedUserId(prisma);

  console.log(
    `Sincronizando feriados em ${organizations.length} organização(ões)...`,
  );

  let totalCreated = 0;
  let totalSkipped = 0;
  let totalUpdated = 0;

  for (const organization of organizations) {
    const result = await prisma.$transaction(async (tx) =>
      seedHolidaysForOrganization(tx, organization.id, createdByUserId),
    );

    totalCreated += result.created;
    totalSkipped += result.skipped;
    totalUpdated += result.updated;

    console.log(
      `- ${organization.name}: tipo ${result.eventTypeCreated ? 'criado' : 'reutilizado'}, ${result.created} criado(s), ${result.updated} atualizado(s), ${result.skipped} ignorado(s)`,
    );
  }

  console.log(
    `Sincronização concluída. Total: ${totalCreated} criado(s), ${totalUpdated} atualizado(s), ${totalSkipped} ignorado(s).`,
  );
}

main()
  .catch((error) => {
    console.error('Falha ao sincronizar feriados das organizações:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
