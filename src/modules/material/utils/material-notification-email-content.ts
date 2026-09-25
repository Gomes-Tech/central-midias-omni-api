export const buildMaterialNotificationEmailSubject = (
  materialName: string,
): string => `Novo material: ${materialName}`;

export const buildMaterialNotificationEmailContent = (
  materialName: string,
): string =>
  [
    'Novo material disponível',
    '',
    'Foi publicado um novo material na plataforma:',
    materialName,
    '',
    'Acesse a plataforma para visualizar o conteúdo.',
  ].join('\n');
