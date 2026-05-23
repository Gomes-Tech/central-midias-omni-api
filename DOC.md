# Central Midias API

## Visão Geral

Central Midias API é uma API backend em NestJS para administrar uma central de mídias multi-tenant. O sistema organiza organizações, usuários, membros, perfis, permissões, categorias hierárquicas, banners, materiais e arquivos associados.

O backend expõe endpoints REST sob o prefixo global `/api`, usa PostgreSQL via Prisma, autenticação JWT com refresh token, autorização por RBAC, validação global de DTOs, upload multipart em memória e armazenamento de arquivos atualmente direcionado para S3.

## Problema Que Resolve

A aplicação concentra a gestão de conteúdos de mídia por organização. Ela permite:

- controlar acesso ao backoffice por perfis globais e por vínculos de membro em organizações;
- organizar materiais em categorias hierárquicas;
- restringir categorias por perfil;
- cadastrar banners com imagens desktop/mobile e período de ativação;
- disponibilizar URLs assinadas para arquivos armazenados;
- manter logs, métricas Prometheus, health checks e mecanismos básicos de segurança.

## Objetivo de Negócio

Servir como backend administrativo e operacional de uma central de conteúdos/mídias, permitindo que organizações tenham acervos, banners e menus próprios, com acesso segmentado por perfil e autenticação centralizada.

## Stack

- Node.js 22 no Dockerfile de produção.
- NestJS 11.
- TypeScript 5.
- Prisma 6 com PostgreSQL.
- JWT via `@nestjs/jwt`.
- Validação com `class-validator` e `class-transformer`.
- Upload com `multer` em memória.
- Armazenamento de arquivos via AWS S3 como provider ativo.
- Supabase Storage e storage local existem no código, mas não são usados pelo `StorageService` atual.
- Email via `@nestjs-modules/mailer` com templates Pug.
- Cache via `@nestjs/cache-manager`.
- Métricas com `prom-client`.
- Observabilidade local com Prometheus e Grafana.
- Testes com Jest e Supertest.
- CI com GitHub Actions.

## Arquitetura

O projeto segue uma arquitetura modular típica de NestJS:

- `controller`: camada HTTP, decorators de rota, extração de headers/body/query/files.
- `dto`: contratos de entrada e validações.
- `use-cases`: regras de aplicação e orquestração.
- `repository`: acesso a dados via Prisma.
- `entities`: interfaces de retorno/contratos internos.
- `infrastructure`: Prisma, config, JWT, logs, cache, métricas, storage, email, health, circuit breaker.
- `common`: decorators, guards, filters, interceptors, middlewares, utils e constantes compartilhadas.

O padrão predominante é: `Controller -> UseCase -> Repository -> Prisma`. Alguns use cases chamam outros use cases para validar existência, permissões ou unicidade.

## Estrutura de Pastas

```text
src/
  app.module.ts                 # composição global dos módulos, guards, filters e interceptors
  main.ts                       # bootstrap HTTP, CORS, Swagger, prefixo /api e pipes globais
  common/
    constants/                  # tipos de upload permitidos
    decorators/                 # @Public, @RequirePermission, @OrgId, @UserId, etc.
    filters/                    # exceções customizadas e filtro HTTP global
    guards/                     # AuthGuard, PlatformPermissionGuard, CategoryPermissionGuard
    interceptors/               # métricas, upload, honeypot, request id, circuit breaker
    middlewares/                # multipart, request id, organização
    utils/                      # slug, UUID, token, sanitize, JWT payload, secureCompare
  infrastructure/
    cache/                      # wrapper de cache com métricas/circuit breaker
    circuit-breaker/            # serviço de circuit breaker em memória
    config/                     # ConfigModule e validação de envs
    criptography/               # bcrypt hash/compare
    health/                     # checks de DB/cache
    jwt/                        # provider global JWT_SERVICE
    log/                        # logger persistente em banco
    metrics/                    # Prometheus + interceptor HTTP
    prisma/                     # PrismaService
    providers/
      mail/                     # MailerModule e templates Pug
      storage/                  # S3, Supabase, local e facade StorageService
    security/                   # blacklist de tokens e security logger
    throttler/                  # rate limit global
  modules/
    auth/
    banner/
    category/
    category-role-access/
    health/
    material/
    member/
    module/
    organization/
    roles/
    tag/
    token-password/
    user/
prisma/
  schema.prisma
  migrations/
  seed.ts
  seed.js
docker/
  observability/
terraform/
test/
```

## Fluxo da Aplicação

1. `main.ts` cria a aplicação Nest, configura Pug para templates de email, `cookieParser`, parser multipart global, JSON até 3 MB, request id, CORS, prefixo global `/api`, Swagger/Scalar em ambiente não-prod, `ValidationPipe`, Helmet e compressão.
2. `AppModule` importa infraestrutura e módulos de negócio, registra `HttpExceptionFilter`, `ThrottlerGuard`, `HoneypotFieldInterceptor`, `MetricsInterceptor`, validação global de upload e `AuthGuard`.
3. Rotas marcadas com `@Public()` pulam autenticação JWT e API key.
4. Rotas privadas exigem `x-api-key` igual a `SERVER_AUTH_SECRET` e `Authorization: Bearer <jwt>`.
5. Rotas multi-tenant geralmente passam pelo `OrganizationMiddleware`, que exige `x-organization-id` válido, ativo e não deletado.
6. Rotas de backoffice usam `PlatformPermissionGuard`, que valida `@RequirePermission(module, action)` contra `RolePermission`.
7. Controllers chamam use cases; use cases validam regras; repositories persistem com Prisma.
8. Arquivos multipart são processados pelo middleware global `multer().any()` e validados por interceptors globais de tipo e tamanho.

## Autenticação e Autorização

### Autenticação

- Login: `POST /api/auth/sign-in`.
- Payload: `{ "email": string, "password": string }`.
- Resposta: `{ accessToken, refreshToken, canAccessBackoffice }`.
- Access token contém `id` e `jti`.
- Refresh token também contém `id` e `jti`, assinado com `JWT_REFRESH_SECRET`.
- Rotas privadas exigem simultaneamente:
  - `x-api-key: <SERVER_AUTH_SECRET>`;
  - `Authorization: Bearer <accessToken>`.

### Refresh e Logout

- `POST /api/auth/refresh` valida refresh token, checa blacklist, revoga o refresh antigo e emite novo par.
- `POST /api/auth/logout` coloca access token e refresh token em blacklist quando possuem `jti`.
- Blacklist usa `CacheService`, que hoje usa `@nestjs/cache-manager` sem adapter Redis explícito no código.

### RBAC

- `Role` pode ser global/backoffice (`canAccessBackoffice=true`) e possuir `RolePermission`.
- `RolePermission` liga `Role + Module + Action`.
- `Action`: `CREATE`, `READ`, `UPDATE`, `DELETE`.
- `@RequirePermission('users', 'read')` grava metadata `users:read`; o guard converte action para uppercase.
- Se o usuário global tem role `ADMIN` e permissão, o acesso passa.
- Caso contrário, o guard exige um `Member` na organização do header `x-organization-id`, com role que também tenha a permissão.

### Categoria por Perfil

- `CategoryRoleAccess` liga categoria, role e organização.
- `CategoryPermissionGuard` protege `GET /api/categories/slug/:slug`.
- Árvore de categorias (`GET /api/categories/tree`) inclui categorias acessíveis ao role do membro e seus ancestrais; admin global visualiza todas.

## Rotas da API

Todas as rotas abaixo estão sob `/api`, exceto `/docs` e `/reference`, que são habilitadas fora de produção.

| Método | Rota | Descrição | Auth |
|---|---|---|---|
| GET | `/` | Retorna mensagem do `AppService`. | Pública |
| GET | `/file?path=` | Retorna URL assinada para arquivo. | Pública |
| GET | `/file/:path` | Retorna URL assinada para arquivo por path param simples. | Pública |
| GET | `/health` | Health check completo de DB e cache. | Pública |
| GET | `/health/live` | Liveness probe. | Pública |
| GET | `/health/ready` | Readiness probe. | Pública |
| GET | `/metrics` | Métricas Prometheus. | Pública |
| POST | `/auth/sign-in` | Login por email/senha. | Pública, throttled |
| POST | `/auth/refresh` | Renova access/refresh token. | Pública |
| POST | `/auth/logout` | Revoga tokens enviados. | Pública no decorator, mas lê Authorization se presente |
| POST | `/auth/first-access` | Define nova senha no primeiro acesso. | JWT + API key |
| POST | `/auth/forgot-password` | Gera token de reset quando email existe. | Pública, throttled |
| POST | `/auth/verify-token` | Valida token de reset. | Pública, throttled |
| POST | `/auth/reset-password` | Reseta senha com token. | Pública, throttled |
| GET | `/organizations` | Lista organizações. | JWT + API key + `organizations:READ` |
| GET | `/organizations/select` | Lista organizações ativas para select. | JWT + API key + `organizations:READ` |
| GET | `/organizations/accessible` | Lista organizações acessíveis ao usuário. | JWT + API key |
| GET | `/organizations/:id` | Detalha organização com `avatarUrl`. | JWT + API key + `organizations:READ` |
| POST | `/organizations` | Cria organização e vincula criador como ADMIN. | JWT + API key + `organizations:CREATE` |
| PATCH | `/organizations/:id` | Atualiza organização e avatar opcional. | JWT + API key + `organizations:UPDATE` |
| DELETE | `/organizations/:id` | Desativa organização. | JWT + API key + `organizations:DELETE` |
| GET | `/users` | Lista usuários paginados/filtros. | JWT + API key + `users:READ` |
| GET | `/users/me` | Dados do usuário autenticado. | JWT + API key |
| GET | `/users/:id` | Detalha usuário sem senha. | JWT + API key + `users:READ` |
| POST | `/users` | Cria usuário e membro na organização atual. | JWT + API key + `users:CREATE` |
| POST | `/users/global` | Cria usuário global e membros nas organizações informadas. | JWT + API key + `users:CREATE` |
| PATCH | `/users/:id` | Atualiza usuário. | JWT + API key + `users:UPDATE` |
| DELETE | `/users/:id` | Soft delete de usuário. | JWT + API key + `users:DELETE` |
| GET | `/members` | Lista membros da organização. | JWT + API key + org + `members:READ` |
| GET | `/members/me` | Retorna role do usuário na organização. | JWT + API key + org |
| GET | `/members/role` | Retorna role detalhada, permissões e categorias. | JWT + API key + org |
| GET | `/members/:id` | Detalha membro. | JWT + API key + org + `members:READ` |
| POST | `/members/new` | Cria usuário e membro. | JWT + API key + org + `members:CREATE` |
| POST | `/members/add` | Adiciona usuário existente como membro. | JWT + API key + org + `members:CREATE` |
| PATCH | `/members/:id` | Troca role do membro. | JWT + API key + org + `members:UPDATE` |
| DELETE | `/members/:id` | Remove membro fisicamente. | JWT + API key + org + `members:DELETE` |
| GET | `/roles` | Lista roles. | JWT + API key + `roles:READ` |
| GET | `/roles/select` | Lista roles para select. | JWT + API key + `roles:READ` |
| GET | `/roles/permissions` | Lista roles não-backoffice e categorias vinculadas por organização. | JWT + API key + org + `roles:READ` |
| GET | `/roles/:id` | Detalha role. | JWT + API key + `roles:READ` |
| POST | `/roles` | Cria role global com permissões de módulo. | JWT + API key + `roles:CREATE` |
| POST | `/roles/permissions` | Cria role de organização e vínculos de categoria. | JWT + API key + org + `roles:CREATE` |
| PATCH | `/roles/:id` | Atualiza role. | JWT + API key + `roles:UPDATE` |
| DELETE | `/roles/:id` | Soft delete de role se não sistêmica/não vinculada. | JWT + API key + `roles:DELETE` |
| GET | `/modules` | Lista módulos de permissão. | JWT + API key + `roles:READ` |
| GET | `/modules/select` | Lista módulos para select. | JWT + API key + `roles:READ` |
| GET | `/modules/:id` | Detalha módulo. | JWT + API key + `roles:READ` |
| POST | `/modules` | Cria módulo. | JWT + API key + `roles:CREATE` |
| PATCH | `/modules/:id` | Atualiza módulo. | JWT + API key + `roles:UPDATE` |
| DELETE | `/modules/:id` | Remove módulo se não houver permissões vinculadas. | JWT + API key + `roles:DELETE` |
| GET | `/categories` | Lista categorias por filtros. | JWT + API key + org + `categories:READ` |
| GET | `/categories/tree` | Árvore visível ao usuário. | JWT + API key + org |
| GET | `/categories/slug/:slug` | Caminho e subárvore por slug com validação de acesso. | JWT + API key + org + CategoryPermissionGuard |
| GET | `/categories/:id` | Detalha categoria. | JWT + API key + org + `categories:READ` |
| POST | `/categories` | Cria categoria. | JWT + API key + org + `categories:CREATE` |
| PATCH | `/categories/:id` | Atualiza categoria. | JWT + API key + org + `categories:UPDATE` |
| DELETE | `/categories/:id` | Soft delete recursivo de categoria e filhos. | JWT + API key + org + `categories:DELETE` |
| GET | `/category-role-accesses` | Lista vínculos categoria-role da organização. | JWT + API key + org + `categories:READ` |
| GET | `/category-role-accesses/category/:categoryId/roles` | Lista roles vinculadas à categoria. | JWT + API key + org + `categories:READ` |
| POST | `/category-role-accesses` | Cria vínculo categoria-role. | JWT + API key + org + `categories:UPDATE` |
| DELETE | `/category-role-accesses/:id` | Remove vínculo. | JWT + API key + org + `categories:UPDATE` |
| GET | `/materials` | Lista materiais por categoria/busca. | JWT + API key + org + `materials:READ` |
| GET | `/materials/:id` | Detalha material. | JWT + API key + org + `materials:READ` |
| GET | `/materials/:id/files` | Lista arquivos do material com URL assinada. | JWT + API key + org + `materials:READ` |
| POST | `/materials` | Cria material e arquivos opcionais. | JWT + API key + org + `materials:CREATE` |
| POST | `/materials/:id/files` | Faz upload de arquivos adicionais. | JWT + API key + org + `materials:UPDATE` |
| PATCH | `/materials/:id` | Atualiza material. | JWT + API key + org + `materials:UPDATE` |
| DELETE | `/materials/:id` | Soft delete de material e tenta remover arquivos. | JWT + API key + org + `materials:DELETE` |
| DELETE | `/materials/:id/files/:fileId` | Remove arquivo do material. | JWT + API key + org + `materials:UPDATE` |
| GET | `/banners` | Lista banners com filtros. | JWT + API key + org + `banners:READ` |
| GET | `/banners/list` | Lista banners ativos/vigentes para consumo web. | JWT + API key + org |
| GET | `/banners/:id` | Detalha banner e remove keys da resposta. | JWT + API key + org + `banners:READ` |
| POST | `/banners` | Cria banner com imagens mobile e desktop obrigatórias. | JWT + API key + org + `banners:CREATE` |
| PATCH | `/banners/:id` | Atualiza banner e imagens opcionais. | JWT + API key + org + `banners:UPDATE` |
| DELETE | `/banners/:id` | Soft delete de banner. | JWT + API key + org + `banners:DELETE` |
| GET | `/tags` | Lista tags. | JWT + API key + `tags:READ` |
| GET | `/tags/:id` | Detalha tag. | JWT + API key + `tags:READ` |
| POST | `/tags` | Cria tag. | JWT + API key + `tags:CREATE` |
| PATCH | `/tags/:id` | Atualiza tag. | JWT + API key + `tags:UPDATE` |
| DELETE | `/tags/:id` | Remove tag se não possuir materiais nem buscas. | JWT + API key + `tags:DELETE` |

## Payloads e Validações Principais

### Auth

- `LoginDTO`: `email` obrigatório e válido, `password` obrigatório.
- `ResetPasswordDTO`: `token`, `email` e `password`; senha forte exige mínimo 8 caracteres, maiúscula, minúscula e número.
- `VerifyTokenDTO`: `token` e `email`.
- `ForgotPasswordDTO`: `email`.

### Organization

- Criar: `name`, `slug`; opcionais `isActive`, `domain`, `shouldAttachUsersByDomain` e arquivo de avatar.
- Atualizar: `name`, `slug`, `isActive` e arquivo opcional.
- Upload usa limite de 5 MB nas rotas anotadas com `@MaxFileSize(undefined, 5)`.

### User

- Criar usuário de organização: `name`, `email`, `taxIdentifier`, `phone`, `socialReason`, `birthDate`, `admissionDate`, `roleId`, `managerAssignments?`.
- Criar usuário global: `name`, `email`, `taxIdentifier`, `globalRoleId`, `organizationIds`.
- Senha inicial é o `taxIdentifier` com hash bcrypt.
- Atualizar permite `name`, `email`, `password`, `isActive`, `taxIdentifier`, `phone`, `socialReason`, `isFirstAccess`, `organizationIds`, `managerAssignments`.

### Category

- Criar: `name`, `order`, opcionais `isActive`, `parentId`.
- Slug é gerado no use case a partir do nome.
- Ordem é única por nível de irmãos dentro da organização.
- Atualizar pode alterar `name`, `slug`, `order`, `isActive`, `parentId`.

### Material

- Criar: `name`, `categoryId`, `description?`; arquivos multipart opcionais.
- Atualizar: `name?`, `description?`, `categoryId?`.
- Arquivos aceitos globalmente: PNG, JPEG, PDF, DOC/DOCX, MP4, MP3, PPT/PPTX, EPS, XLS/XLSX.

### Banner

- Criar: `name`, `order`, `link?`, `isActive?`, `initialDate?`, `finishDate?`; exige arquivo mobile e desktop.
- Atualizar: mesmos campos opcionais e imagens opcionais.
- Datas são validadas para garantir `initialDate <= finishDate`.

## Banco de Dados

ORM: Prisma com PostgreSQL.

### Entidades

- `User`: usuários do sistema, senha, documento único, contato, avatar, primeiro acesso, soft delete, role global opcional e memberships.
- `UserHierarchy`: relação gestor-subordinado por organização. O schema existe, mas os DTOs/use cases atuais só expõem `managerAssignments`; não há persistência implementada no `UserRepository.update`.
- `PasswordResetToken`: tokens de reset com hash, email, `used`, expiração e criação.
- `Role`: perfis globais ou organizacionais, com flags de sistema, backoffice e subordinação.
- `Module`: módulos usados para RBAC, como `users`, `roles`, `categories`.
- `RolePermission`: ação permitida por role e módulo.
- `Member`: vínculo `organization + user + role`, único por organização/usuário.
- `Organization`: tenant, slug/domínio únicos, avatar, status e soft delete.
- `Category`: menu hierárquico por organização, slug único por organização e ordem única por nível.
- `CategoryRoleAccess`: permissão de role para categoria em uma organização.
- `Banner`: banners por organização com imagens mobile/desktop armazenadas por key.
- `Material`: material associado a categoria. Atenção: o próprio schema comenta que está fora do padrão completo de soft delete e usa principalmente `deletedAt`.
- `MaterialFile`: arquivos de um material.
- `Tag`: tags globais.
- `TagSearch`: termos de busca associados a tags.
- `Log`: logs persistidos.
- `SeedStatus`: controle para rodar seed uma única vez.

### Relacionamentos Críticos

- `Organization` possui muitos `Member`, `Category`, `Banner`, `CategoryRoleAccess` e `UserHierarchy`.
- `User` possui `globalRole` opcional e vários `Member`.
- `Role` possui `RolePermission`, `Member`, `CategoryRoleAccess` e usuários globais.
- `Category` possui árvore por `parentId`, muitos materiais e muitos vínculos de acesso.
- `Material` possui muitos `MaterialFile` e relação many-to-many com `Tag`.

## Regras de Negócio

- Usuário não pode ser criado com email ou documento já existentes em usuários não deletados.
- Usuário criado recebe senha inicial igual ao documento (`taxIdentifier`) com hash bcrypt.
- Usuário global cria memberships em todas as organizações informadas usando `globalRoleId` também como `roleId`.
- `first-access` só permite alterar senha se `isFirstAccess=true`.
- Reset de senha usa token aleatório de 6 caracteres, armazena hash e marca todos tokens do email como usados após reset.
- Forgot password não revela se o email existe.
- Role sistêmica (`isSystem`) não pode ser removida.
- Role vinculada a membros não pode ser removida.
- Módulo com `RolePermission` vinculada não pode ser removido.
- Categoria não pode ter slug duplicado na organização.
- Categoria não pode repetir `order` entre irmãos.
- Categoria não pode ser filha dela mesma nem de seus descendentes.
- Ao deletar categoria, ela e todas as subcategorias são marcadas como inativas/deletadas.
- Material exige categoria existente, ativa e pertencente à organização.
- Material não pode repetir `name` dentro da mesma categoria enquanto não deletado.
- Banner exige imagem mobile e desktop no create.
- Banner com datas deve respeitar data inicial menor ou igual à final.
- Tag não pode ser deletada se possuir materiais ou buscas associadas.

## Upload e Storage

O `multipartMiddleware` global processa qualquer request `multipart/form-data` com `multer.memoryStorage()` e limite bruto de 100 MB por arquivo antes dos interceptors.

Validações globais:

- tipo/extensão em `FileTypeValidationInterceptor`;
- tamanho em `FileSizeValidationInterceptor`, padrão 5 MB, customizável por `@MaxFileSize`.

Provider ativo:

- `StorageService` usa somente `S3StorageService`.
- `getPublicUrl` gera URL assinada S3 com `GetObjectCommand`.
- `uploadFile` grava objeto em S3 com key segura por pasta.

Providers não ativos pela facade:

- `SupabaseService` existe, mas está comentado no `StorageService`.
- `LocalStorageService` existe, mas está comentado no `StorageService`.

Atenção: `StorageService.deleteFile` atualmente só faz `console.log` e não chama S3/Supabase/local; remoções de arquivos no domínio não apagam efetivamente os objetos remotos pela facade atual.

## Integrações Externas

- PostgreSQL via `DATABASE_URL`.
- AWS S3 via `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET`.
- SMTP via `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`.
- Supabase Storage existe no código, mas não está ativo na facade.
- Prometheus coleta `/api/metrics`.
- Grafana possui dashboard provisionado em `docker/observability/grafana`.
- Sentry é citado no `SecurityLoggerService`, mas o código força `Sentry = null`; não há integração efetiva.

## Variáveis de Ambiente

Obrigatórias pela validação em `ConfigModule`:

```text
NODE_ENV=dev|prod
JWT_SECRET
JWT_EXPIRES
JWT_REFRESH_SECRET
JWT_REFRESH_EXPIRES
PORT
DATABASE_URL
SERVER_AUTH_SECRET
```

Obrigatórias em produção pela validação:

```text
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASS
SMTP_FROM
FRONTEND_URL
```

Usadas pelo código, embora não estejam todas no schema Joi:

```text
ALLOWED_ORIGINS
TOKEN_PASSWORD_EXPIRES_MINUTES
AWS_REGION
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
S3_BUCKET
S3_PRESIGNED_EXPIRES_SECONDS
SUPABASE_URL
SUBAPASE_URL
SUPABASE_KEY
SUPABASE_BUCKET
SUPABASE_SIGNED_URL_EXPIRES_SECONDS
POSTGRES_USER
POSTGRES_PASSWORD
POSTGRES_DB
SENTRY_DSN
```

## Como Rodar

Instalação:

```bash
npm install
```

Gerar Prisma Client:

```bash
npm run prisma:generate
```

Rodar em desenvolvimento:

```bash
npm run dev
```

A API sobe por padrão em:

```text
http://localhost:4000/api
```

Docs em ambiente não-prod:

```text
http://localhost:4000/docs
http://localhost:4000/reference
```

Aplicar migrations e seed:

```bash
npm run db:deploy
```

Rodar somente seed:

```bash
npm run db:seed
```

## Scripts Disponíveis

| Script | Descrição |
|---|---|
| `npm run build` | Build Nest para `dist`. |
| `npm run start` | Inicia Nest sem watch. |
| `npm run dev` | Inicia Nest em watch mode. |
| `npm run start:debug` | Watch com debug. |
| `npm run start:prod` | Executa `node dist/main`. |
| `npm run lint` | ESLint com `--fix`. |
| `npm run format` | Prettier em `src` e `test`. |
| `npm run test` | Testes unitários Jest. |
| `npm run test:watch` | Jest watch. |
| `npm run test:cov` | Cobertura. |
| `npm run test:e2e` | Testes e2e com config em `test/jest-e2e.json`. |
| `npm run validate:push` | Testes unitários, e2e e build. |
| `npm run prisma:generate` | Gera Prisma Client. |
| `npm run db:deploy` | `prisma migrate deploy` + seed. |
| `npm run db:seed` | Executa `prisma/seed.js`. |

## Docker, Deploy e Observabilidade

### Dockerfile

Build multi-stage:

- imagem base `node:22-alpine`;
- instala dependências, roda `prisma:generate` e `build`;
- runtime com `dumb-init` e `openssl`;
- copia `dist`, `node_modules`, `prisma` e templates Pug;
- comando final roda migrations/seed e inicia `node dist/src/main.js`.

### Docker Compose

`docker-compose.yml` sobe:

- `redis`;
- `app` na porta 4000.

`docker-compose.dev.yml` adiciona:

- Prometheus na porta 9090;
- Grafana na porta 3001;
- dashboard e datasource provisionados.

Atenção: há serviço Redis no compose, mas o `CacheModule` atual registra cache em memória sem adapter Redis explícito.

### Terraform

`terraform/` provisiona containers Docker para Postgres e app usando provider `kreuzwerker/docker`. O `DATABASE_URL` é montado a partir de `postgres_user`, `postgres_password`, `postgres_db` e host `postgres`.

### CI

`.github/workflows/ci.yml` roda em PRs para `main` e `develop`:

```text
npm ci
npm run lint
npm run test
npm run test:e2e
npm run build
```

## Testes

O projeto possui muitos testes unitários (`*.spec.ts`) em módulos, guards, interceptors, middlewares, utils e infraestrutura. Também há teste e2e em `test/app.e2e-spec.ts`.

Configuração Jest no `package.json`:

- `rootDir: src`;
- mocks para aliases comuns em `src/test-utils`;
- cobertura ignora módulos, DTOs, entities, exceptions, `main.ts`, `app.module.ts`, PrismaService e templates.

## Convenções do Projeto

- Alias TypeScript: `@common/*`, `@infrastructure/*`, `@modules/*`, `types/*`.
- IDs gerados via `uuid` (`generateId()`), embora algumas entidades Prisma tenham defaults próprios.
- Exceções de domínio usam filtros customizados em `src/common/filters`.
- DTOs usam `@Sanitize()` em campos string relevantes.
- `@RequirePermission(resource, action)` deve usar o nome do módulo persistido em `modules.name`.
- Para rotas multi-tenant, use sempre `@OrgId()` e/ou respeite `OrganizationMiddleware`.
- Não adicionar `FileInterceptor` nas rotas atuais de upload: o middleware multipart global já consome o body.
- Rotas que recebem upload devem confiar em `@UploadedFile()`/`@UploadedFiles()` populados pelo middleware global.

## Pontos Críticos e Débitos Técnicos

- O repositório contém `.env` com segredos reais e uma chave `.pem`. Remover do versionamento, rotacionar credenciais e manter apenas `.env.example`.
- O README anterior era o template padrão do Nest e foi substituído por esta documentação.
- `StorageService.deleteFile` não apaga arquivos no provider ativo; apenas loga os paths.
- `CategoryRepository.findTreeBySlug` usa raw SQL com nomes `"Category"`, `"Role"`, `"Member"` e campos camelCase, mas o Prisma schema mapeia tabelas para `categories`, `roles`, `members` e campos snake_case. Esse endpoint tende a falhar no PostgreSQL real.
- `UserRepository.findAll` usa relação `platformUserOrganizations`, que não existe no `schema.prisma`. O schema atual usa `members`.
- `UserRepository.update` ignora `organizationIds` e `managerAssignments`, apesar de o DTO aceitar esses campos.
- `UserRepository.findById` seleciona poucos campos e não retorna `password`, mas `UpdateUserUseCase` compara senha nova com `user.password`; isso pode quebrar atualização de senha.
- `SignInUseCase` chama `FindUserByEmailUseCase.execute` sem `catch`; se email não existe, o fluxo pode lançar `NotFoundException` antes da comparação com dummy hash, contrariando a intenção anti-enumeração escrita no código.
- `OrganizationRepository.delete` apenas seta `isActive=false`; não marca `isDeleted` nem `deletedAt`, apesar do schema suportar soft delete.
- `OrganizationRepository.findAll` aplica `searchTerm` na busca, mas o `count` ignora o filtro.
- `MemberRepository.findAll` calcula `skip`, mas não usa `skip/take`; paginação retorna todos os membros e calcula `totalPages` com base no limit.
- `PrismaService.onModuleInit` cria `$extends` para métricas, mas não substitui a instância usada; as métricas de query podem não ser registradas.
- `CacheModule` usa cache manager padrão em memória; compose sobe Redis, mas não há adapter Redis configurado.
- `MailModule` é importado globalmente e configura SMTP sempre; em dev as variáveis SMTP são opcionais pela validação, mas o módulo ainda monta transport com valores possivelmente indefinidos.
- `.docker/entrypoint.dev.sh` referencia scripts que não existem no `package.json` (`prisma:migrate:init`, `dev:docker`).
- Existem interfaces antigas em `src/modules/user/entities/user.entity.ts` com nomes como `platformRole`, `organizations`, `managerCount`, que não refletem completamente o schema Prisma atual.
- Há mistura de `npm`, `yarn.lock` e `package-lock.json`; CI usa npm.
- O seed cria ADMIN e módulos, mas não cria organização; a própria mensagem do seed avisa que o admin ainda não passa no `PlatformPermissionGuard` sem `Member`/organização para alguns fluxos.

## Melhorias Recomendadas

- Rotacionar todos os segredos vazados e remover arquivos sensíveis do repositório.
- Criar `.env.example` completo e validar também variáveis de S3/Supabase conforme provider ativo.
- Corrigir `CategoryRepository.findTreeBySlug` para Prisma Query Builder ou SQL com nomes reais de tabela/coluna.
- Corrigir `UserRepository.findAll` para filtrar via `members`.
- Implementar persistência real de `managerAssignments` e `organizationIds` ou remover os campos dos DTOs até existir suporte.
- Implementar deleção real no `StorageService.deleteFile`.
- Configurar Redis de fato se blacklist/cache precisarem sobreviver a restart ou escalar horizontalmente.
- Ajustar fluxo anti-enumeração do login para tratar email inexistente sem vazar `NotFoundException`.
- Separar roles globais/backoffice de roles organizacionais com contratos mais explícitos.
- Padronizar soft delete entre `Organization`, `Role`, `Category`, `Banner`, `Material` e `User`.
- Adicionar testes e2e cobrindo login, refresh, RBAC com organização, upload de material/banner e árvore de categoria.
- Remover arquivos/contratos obsoletos ou alinhar entities com o schema.

## Contexto para IA

Esta aplicação é um backend NestJS multi-tenant. O fluxo comum é: request chega em `/api`, passa por CORS, middlewares globais, `AuthGuard`, `OrganizationMiddleware` quando aplicável, `PlatformPermissionGuard` quando a rota usa backoffice/RBAC, controller, use case e repository Prisma.

Antes de alterar qualquer feature, verifique:

- se a rota precisa de `x-api-key`, JWT e `x-organization-id`;
- se existe `@RequirePermission` e qual `modules.name` deve existir no banco;
- se o dado deve respeitar `organizationId`;
- se a entidade usa `isDeleted`, `deletedAt` ou ambos;
- se arquivos devem ser enviados por multipart já parseado pelo middleware global;
- se o storage precisa gravar, assinar URL ou deletar objeto remoto;
- se o DTO tem campos que ainda não são persistidos.

Fluxos críticos:

- Login/refresh/logout dependem de JWT, `jti`, blacklist e cache.
- Backoffice depende de `Role`, `Module`, `RolePermission`, `Member` e header `x-organization-id`.
- Categorias dependem de hierarquia, unicidade de slug e ordem por nível.
- Materiais dependem de categoria ativa na organização e arquivos no storage.
- Banners dependem de imagens mobile/desktop, datas válidas e storage.
- Reset de senha depende de token hash em `password_reset_tokens` e SMTP em produção.

Partes com maior acoplamento:

- `User`, `Member`, `Role`, `Organization` e `PlatformPermissionGuard`.
- `Category`, `CategoryRoleAccess`, `Member` e `CategoryPermissionGuard`.
- `Material`/`Banner` com `StorageService`.
- `Auth` com `User`, `Roles`, `TokenPassword`, `Security` e `Cache`.

Para implementar novas features sem quebrar o sistema:

- siga o padrão `dto -> controller -> use-case -> repository`;
- adicione validações no DTO e regras no use case, não diretamente no controller;
- mantenha queries filtradas por `organizationId` em recursos tenant-scoped;
- use `LoggerService` para eventos persistentes relevantes;
- use `@RequirePermission` com módulos já seedados ou crie migration/seed para novos módulos;
- atualize testes unitários dos use cases e repositories;
- quando tocar autenticação/RBAC, rode pelo menos `npm run test` e `npm run build`;
- quando tocar schema Prisma, adicione migration e revise seed.

O código-fonte deve ser tratado como fonte da verdade. Esta documentação registra também inconsistências encontradas para que futuras manutenções não assumam que todo contrato existente está completo ou funcionando em produção.
