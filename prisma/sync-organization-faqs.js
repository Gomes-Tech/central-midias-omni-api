const { randomUUID } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const organizationsWithoutFaq = await prisma.organization.findMany({
    where: {
      isDeleted: false,
      faqs: {
        none: {
          isDeleted: false,
        },
      },
    },
    select: {
      id: true,
      name: true,
    },
    orderBy: [{ name: 'asc' }],
  });

  if (organizationsWithoutFaq.length === 0) {
    console.log('Todas as organizações já possuem FAQ.');
    return;
  }

  console.log(
    `Sincronizando FAQ em ${organizationsWithoutFaq.length} organização(ões)...`,
  );

  const result = await prisma.faq.createMany({
    data: organizationsWithoutFaq.map((organization) => ({
      id: randomUUID(),
      organizationId: organization.id,
      name: 'FAQ',
      order: 0,
      isActive: true,
    })),
  });

  for (const organization of organizationsWithoutFaq) {
    console.log(`- ${organization.name}: FAQ criado`);
  }

  console.log(
    `Sincronização concluída. Total de FAQs criados: ${result.count}`,
  );
}

main()
  .catch((error) => {
    console.error('Falha ao sincronizar FAQs das organizações:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
