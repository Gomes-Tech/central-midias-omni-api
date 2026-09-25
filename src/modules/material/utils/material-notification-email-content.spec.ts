import {
  buildMaterialNotificationEmailContent,
  buildMaterialNotificationEmailSubject,
} from './material-notification-email-content';

describe('material-notification-email-content', () => {
  it('deve montar o assunto com o nome do material', () => {
    expect(buildMaterialNotificationEmailSubject('Campanha ABCDEF')).toBe(
      'Novo material: Campanha ABCDEF',
    );
  });

  it('deve montar o conteúdo textual do e-mail', () => {
    expect(buildMaterialNotificationEmailContent('Campanha ABCDEF')).toBe(
      [
        'Novo material disponível',
        '',
        'Foi publicado um novo material na plataforma:',
        'Campanha ABCDEF',
        '',
        'Acesse a plataforma para visualizar o conteúdo.',
      ].join('\n'),
    );
  });
});
