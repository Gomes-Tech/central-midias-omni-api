# Relatorio de Auditoria da Suite de Testes

Data da analise: 2026-05-23

## Objetivo

Registrar o estado atual da suite automatizada do backend NestJS e orientar os proximos passos de melhoria, sem refatoracao ainda.

## Resumo executivo

- A suite existe em volume relevante: 148 specs unitarias em `src/` + 1 e2e em `test/`.
- A cobertura e ampla em quantidade, mas ainda fraca em valor de negocio real.
- Ha muita validacao de fachada, mocks e helpers, e pouca validacao integrada de fluxo real.
- Existe pelo menos 1 teste quebrado que impede confianca no baseline: `src/modules/banner/banner.controller.spec.ts`.
- O e2e atual e apenas um smoke test de `GET /` e nao atravessa auth, RBAC, tenant nem storage.

## Como a analise foi feita

- Inventario completo de specs com `rg --files`.
- Leitura de `package.json` e `test/jest-e2e.json`.
- Leitura das areas mais sensiveis da aplicacao: auth, tenant, RBAC, banner, storage, health, metrics e guards.
- Comparacao entre o comportamento esperado e o que os testes realmente validam.

## Estado geral da suite

- Ha cobertura em quase todas as areas de `common`, `infrastructure` e `modules`.
- A maior parte dos testes esta concentrada em `use-cases`, `repositories`, `controllers`, guards e interceptors.
- Muitos arquivos existem para validar apenas metadados, helpers ou delegacao de chamada.
- A distribuicao por densidade sugere suite mais extensa do que profunda:
  - 18 specs com apenas 1 teste.
  - 40 specs com 2 testes.
  - Apenas parte menor das specs tem cobertura mais rica.
- Nao encontrei duplicatas literais de arquivo, mas encontrei muita repeticao de padrao e baixo valor incremental em varios testes.

## Riscos tecnicos principais

1. Suite nao confiavel como baseline
   - `src/modules/banner/banner.controller.spec.ts` nao compila por um token solto `ase';`.
   - Isso precisa ser corrigido antes de qualquer outra leitura sobre confianca da suite.

2. E2E quase inexistente
   - `test/app.e2e-spec.ts` cobre apenas `GET /` retornando `Hello World!`.
   - Nao valida o fluxo real do sistema: auth JWT, x-api-key, RBAC, organizationId e upload/storage.

3. Infra critica sem cobertura direta
   - `src/infrastructure/providers/storage/storage.service.ts` nao tem teste proprio e o `deleteFile()` atual so faz `console.log`.
   - `src/infrastructure/prisma/prisma.service.ts` esta fora da cobertura e tambem nao tem validação de comportamento.

4. Excesso de mock em areas de negocio
   - Muitos testes validam apenas se um use-case chamou outro use-case ou repositório com os parametros esperados.
   - Isso e util como smoke, mas insuficiente para regras como tenant, visibilidade, imagem de banner, revogacao de token e acesso backoffice.

## Cobertura critica ausente

- `src/modules/roles/use-cases/find-user-backoffice-access.use-case.ts`
  - Sem spec direta.
  - Regra importante para auth/RBAC.

- `src/modules/banner/use-cases/get-banner-by-id.use-case.ts`
  - Existe spec, mas ela nao cobre o branch real de `mobileImageKey` e `desktopImageKey` com `StorageService.getPublicUrl()`.
  - Hoje o teste valida muito mais o caso simples do que o comportamento final.

- `src/modules/organization/use-cases/find-accessible-organizations.use-case.ts`
  - A spec atual so valida `avatarKey: null`.
  - Nao cobre o branch que gera `avatarUrl` a partir da storage.

- `src/infrastructure/providers/storage/storage.service.ts`
  - Sem teste proprio.
  - E um ponto sensivel porque e a porta de entrada para arquivos e URLs assinadas.

- Fluxo integrado real
  - Nao existe e2e suficiente para atravessar auth + tenant + RBAC + negocio.

## Problemas arquiteturais nos testes

- O Jest usa mocks globais em `moduleNameMapper` para decorators, filters, Prisma, log e outros pontos: `package.json`.
- Isso reduz custo de teste, mas tambem pode mascarar comportamento real e gerar falsa sensacao de cobertura.
- A cobertura esta configurada de forma ampla demais e inclui `*.spec.ts` em `collectCoverageFrom`, o que infla a leitura do relatorio.
- A maior parte dos controllers e use-cases e testada por chamada direta de metodo, nao por request HTTP real.
- Isso enfraquece a validade dos testes de guard, decorator e interceptors no contexto do Nest.

## Arquivos/specs suspeitos ou redundantes

- `src/app.controller.spec.ts`
  - Redundante com o e2e atual, porque valida apenas `getHello()`.

- `src/modules/*/use-cases/test-helpers.spec.ts`
  - Baixo valor de negocio.
  - Testam fabrica de dados, nao regra da aplicacao.

- Specs de decorator e utilitario
  - Em geral sao aceitaveis como smoke, mas muitas estao testando metadados simples e nao comportamento.
  - O risco delas e baixo comparado aos fluxos reais de negocio.

## Testes frageis ou mal implementados

- `src/modules/banner/banner.controller.spec.ts`
  - Quebrado por erro de sintaxe.

- Specs com dependencia forte de mensagens exatas
  - Especialmente auth, banners, guards e interceptors.
  - Nao e um problema grave isoladamente, mas aumenta fragilidade quando a mensagem nao e a regra principal.

- Specs com uso excessivo de cast `as unknown as`
  - Nao sao erradas por si, mas em excesso indicam isolamento exagerado e podem esconder contratos nao tipados corretamente.

- Areas com comportamento temporal
  - Banners com datas, circuit breaker, token blacklist e health usam tempo.
  - Nao vi flaky explicita em larga escala, mas o risco existe se estes testes crescerem sem padrao claro de controle de tempo.

## Estado por area

### Common
- Guards, interceptors e decorators estao relativamente bem cobertos em volume.
- Mesmo assim, boa parte do valor e estrutural, nao integrada.

### Infrastructure
- Metrics, health, cache e circuit breaker tem tests unitarios.
- Storage e Prisma continuam como pontos mais sensiveis e menos confiaveis do ponto de vista de cobertura util.

### Auth
- Tem cobertura boa em volume.
- Ainda falta validar melhor o fluxo final com RBAC, tenant e acesso backoffice.

### Banner
- Area com risco alto.
- Ha muito teste, mas ele ainda nao cobre bem o comportamento final das imagens e do get/delete com storage.
- Existe ao menos 1 spec quebrada aqui.

### Organization / User / Member / Roles / Material / Category / Tag / Module
- A maioria tem cobertura de use-case e repository.
- O padrao dominante e: testar delegacao e erros, mais do que comportamento real sobre dados e multi-tenant.

## Prioridade de correcao

### Alta
- Corrigir `src/modules/banner/banner.controller.spec.ts`.
- Fechar o buraco de `FindUserBackofficeAccessUseCase`.
- Cobrir `GetBannerUseCase` com imagens reais de `mobileImageKey` e `desktopImageKey`.
- Validar `StorageService.deleteFile()` e o contrato real de storage.
- Criar pelo menos 1 e2e que atravesse auth + tenant + RBAC.

### Media
- Reduzir specs de helper sem valor de negocio.
- Rever testes muito acoplados a detalhes de implementacao.
- Ajustar cobertura para nao contar specs no metric geral.
- Revisar arquivos com baixo sinal e alto volume de mock.

### Baixa
- Enxugar testes de decoradores/metadados que ja estao bons como smoke.
- Revisar asserts de mensagem onde a regra principal ja esta coberta por outro teste.

## O que deve ser corrigido primeiro

1. Destravar a suite consertando a spec quebrada de banner.
2. Rodar a suite inteira novamente para descobrir se existe mais algum vermelho mascarado.
3. Cobrir os pontos de negocio mais caros:
   - backoffice access
   - banner com URLs de imagem
   - storage delete/public url
4. Subir o nivel do e2e para um fluxo real.
5. Enxugar testes de baixo valor que so validam helpers ou metadados.
6. Ajustar a cobertura para refletir comportamento real, nao so arquivo executado.

## Proximos passos sugeridos em fases

### Fase 1 - Baseline confiavel
- Corrigir testes quebrados hoje.
- Garantir que a suite rode verde antes de qualquer expansao.

### Fase 2 - Cobertura de negocio real
- Fechar lacunas criticas em auth, RBAC, tenant, banner e storage.

### Fase 3 - Integracao leve
- Criar e2e mais util, com request real e validacao das camadas principais.

### Fase 4 - Limpeza
- Remover redundancias e teste de baixo valor.

### Fase 5 - Ajuste de arquitetura de teste
- Reduzir excesso de mock onde um teste integrado daria mais confianca.

## Observacoes finais

- Nao foi feita nenhuma refatoracao de codigo.
- Nao houve alteracao de regra de negocio.
- O foco desta analise foi diagnostico tecnico, priorizando problemas realmente relevantes.
- Este arquivo deve servir como base para o proximo contexto, sem precisar repetir toda a varredura inicial.

