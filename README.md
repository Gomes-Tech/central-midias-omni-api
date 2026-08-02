# Central de Mídias Omni API

API backend multi-tenant em NestJS para administração e consumo de uma central de mídias (conteúdos, banners, FAQs, materiais, calendário, relatórios e controle de acesso por organização e perfil).

> Documentação viva do sistema, validada contra o código-fonte. Use este arquivo como contexto persistente para manutenção, refatoração e novas features (incluindo assistência por IA).  
> Há um arquivo complementar histórico em `DOC.md` (parcialmente desatualizado). **A fonte da verdade é o código + este README.**

---

## Visão Geral

| Item | Valor |
|---|---|
| Nome do pacote | `central-midias-api` |
| Tipo | API REST (NestJS) |
| Prefixo global | `/api` |
| Porta padrão | `4000` (Docker runtime expõe `4100`; healthcheck do compose ainda aponta `4000`) |
| Docs (não-prod) | `/docs` (Swagger) e `/reference` (Scalar) |
| Multi-tenant | Sim — header `x-organization-id` |
| ORM | Prisma 6 + PostgreSQL |
| Filas | BullMQ + Redis |
| Storage ativo | AWS S3 |
| Auth | JWT (access + refresh) + `x-api-key` |

---

## Objetivo de Negócio

Servir como backend administrativo e operacional de uma central de conteúdos/mídias, permitindo que:

- organizações (tenants) tenham acervos, menus hierárquicos, banners, destaques sociais e FAQs próprios;
- o acesso seja segmentado por perfis globais (backoffice) e por vínculos de membro na organização;
- materiais sejam publicados com arquivos, tags, termos de aceite, links externos, texto copiável e customização;
- o portal consuma listagens públicas autenticadas (banners ativos, materiais, FAQ, árvore de categorias);
- gestores acompanhem métricas e exportem relatórios por e-mail (CSV assíncrono).

### Problema que resolve

Centraliza a gestão de mídias por organização com RBAC, storage de arquivos, notificações por e-mail e auditoria básica (logs, métricas Prometheus, health checks).

---

## Stack

| Camada | Tecnologia |
|---|---|
| Runtime | Node.js 22 (Dockerfile); CI usa Node 20 |
| Framework | NestJS 11 |
| Linguagem | TypeScript 5 |
| ORM / DB | Prisma 6 + PostgreSQL |
| Auth | `@nestjs/jwt`, bcrypt |
| Validação | `class-validator`, `class-transformer`, Joi (envs) |
| Upload | `multer` (memory storage) |
| Storage | AWS S3 (`@aws-sdk/client-s3` + presigner) — Supabase/local existem no código mas **não** estão ativos na facade |
| Filas | BullMQ + Redis (`ioredis` via Bull) |
| Cache de app | `@nestjs/cache-manager` **em memória** (não Redis) |
| E-mail | `@nestjs-modules/mailer` + templates Pug |
| Docs | Swagger + Scalar |
| Segurança | Helmet, throttling, honeypot interceptor, blacklist de JWT |
| Métricas | `prom-client` |
| Testes | Jest + Supertest |
| CI | GitHub Actions |
| Infra local | Docker Compose, Prometheus/Grafana (dev), Terraform (containers Docker) |

---

## Arquitetura

Padrão predominante por módulo:

```text
Controller → UseCase → Repository → Prisma
```

Alguns use cases orquestram outros use cases (existência, permissões, unicidade, enfileiramento).

### Camadas

| Pasta | Responsabilidade |
|---|---|
| `src/modules/*` | Domínio de negócio (auth, user, material, etc.) |
| `src/infrastructure/*` | Prisma, JWT, cache, filas, mail, storage, metrics, health, security, config |
| `src/common/*` | Guards, filters, interceptors, middlewares, decorators, utils |
| `prisma/` | Schema, migrations, seeds e scripts de sync |
| `test/` | E2E + helpers |
| `docker/` | Observabilidade (Prometheus/Grafana) |
| `terraform/` | Provisionamento de containers Docker |

### Diagrama lógico

```text
Cliente (Backoffice / Portal)
        │
        ▼
  Nest bootstrap (CORS, Helmet, multipart, ValidationPipe, /api)
        │
        ├── requestIdMiddleware
        ├── OrganizationMiddleware (exceto rotas excluídas)
        ├── ThrottlerGuard (global)
        ├── AuthGuard (global) → x-api-key + JWT (+ blacklist)
        ├── PlatformPermissionGuard (rotas com @RequirePermission)
        ├── CategoryPermissionGuard (categoria por slug)
        ├── Interceptors: honeypot, metrics, file type/size
        │
        ▼
  Controller → UseCase(s) → Repository → PostgreSQL
                    │
                    ├── StorageService → S3
                    ├── Mailer (prod only na prática dos use cases)
                    └── BullMQ queues → Redis → Processors → e-mail/CSV
```

---

## Estrutura de Pastas

```text
src/
  main.ts                         # bootstrap HTTP
  app.module.ts                   # composição global
  app.controller.ts / app.service.ts
  common/
    constants/                    # tipos de upload permitidos
    decorators/                   # @Public, @RequirePermission, @OrgId, @UserId, @MaxFileSize, throttle
    filters/                      # HttpExceptionFilter + exceções de domínio
    guards/                       # AuthGuard, PlatformPermissionGuard, CategoryPermissionGuard
    interceptors/                 # honeypot, métricas, validação de arquivo, circuit breaker
    middlewares/                  # multipart, request-id, organization
    utils/                        # slug, token, sanitize, JWT payload, secureCompare, etc.
  infrastructure/
    cache/                        # CacheService (memória)
    circuit-breaker/
    config/                       # ConfigModule + Joi
    criptography/                 # bcrypt
    health/
    jwt/
    log/                          # logger persistente (tabela logs)
    metrics/                      # Prometheus
    prisma/
    providers/
      mail/                       # Mailer + templates Pug
      storage/                    # S3 (ativo), Supabase/local (não usados pela facade)
    queue/                        # BullMQ (4 filas)
    security/                     # blacklist + security logger
    throttler/
  modules/
    auth/
    banner/
    category/
    category-role-access/
    faq/
    health/
    material/                     # + queue processors
    member/
    module/                       # módulos RBAC (não confundir com Nest Module)
    organization/
    reports/                      # + queue processor
    roles/
    social-highlight/
    tag/
    token-password/
    user/
  test-utils/                     # mocks Jest
  types/
prisma/
  schema.prisma
  migrations/
  seed.js / seed.ts
  sync-organization-faqs.js
  sync-global-role-categories.js
test/e2e/
docker/observability/
terraform/
.github/workflows/ci.yml
```

Cada módulo de negócio tipicamente contém:

```text
*.controller.ts
*.module.ts
dto/
entities/
repository/
use-cases/
(+ queue/ em material e reports)
```

---

## Fluxo da Aplicação

1. `main.ts` cria a app Nest Express, configura Pug (e-mail), `cookieParser`, multipart global, JSON até 3 MB, request id, CORS, prefixo `/api`, Swagger/Scalar (se `NODE_ENV !== prod`), `ValidationPipe` (whitelist + forbidNonWhitelisted), Helmet e compressão.
2. `AppModule` registra filters/guards/interceptors globais e middlewares.
3. Request autenticada precisa de:
   - `x-api-key: <SERVER_AUTH_SECRET>`
   - `Authorization: Bearer <accessToken>`
4. Request multi-tenant (maioria) precisa de `x-organization-id` (UUID de organização ativa e não deletada), via `OrganizationMiddleware` e/ou `@OrgId()`.
5. Rotas de backoffice usam `@RequirePermission(module, action)` + `PlatformPermissionGuard`.
6. Controllers delegam a use cases; repositórios persistem via Prisma.
7. Uploads multipart são parseados pelo middleware global (`multer().any()`); **não** usar `FileInterceptor` Nest nas rotas atuais.
8. Jobs assíncronos (e-mails/exportações) vão para BullMQ/Redis.

---

## Funcionalidades Existentes

### Autenticação e conta
- Login e-mail/senha com access + refresh JWT (`jti`)
- Refresh com rotação e blacklist do refresh antigo
- Logout com blacklist de tokens
- Primeiro acesso (troca de senha)
- Forgot / verify / reset password (token de 6 caracteres, hash no banco)

### Multi-tenant e RBAC
- Organizações (CRUD, avatar, select, accessible)
- Usuários (org + global), membros, roles (global e organizacional)
- Módulos de permissão e `RolePermission` (CREATE/READ/UPDATE/DELETE)
- Acesso a categorias por role (`CategoryRoleAccess`)

### Conteúdo
- Categorias hierárquicas (`slug`, `slugPath`, order por irmãos, link externo opcional)
- Materiais com arquivos, tags, aceite, view, download, link externo, text copy, customização
- Banners e Social Highlights (imagens mobile/desktop, vigência)
- FAQ (grupos, itens Q&A, detalhe com telefones/WhatsApp e imagem)
- Tags escopadas por organização

### Portal (rotas autenticadas sem permission de backoffice)
- Árvore de categorias, materiais (most-accessed, mosaic, search, details, download, acceptance)
- Listagens de banners/social-highlights ativos
- FAQ da organização
- Member me/role/important-dates
- Organizations accessible / users me

### Relatórios e assíncrono
- Top logins, downloads por usuário, views/downloads de materiais e top buscas consolidadas por termo
- Export CSV por e-mail via fila `report-export`
- Export de aceites de material via fila `material-acceptance-export`
- Notificações de material / aceite via filas de e-mail

### Observabilidade e ops
- Health (`/health`, `/live`, `/ready`)
- Métricas Prometheus (`/metrics`)
- Logs em banco
- Circuit breaker (infra)
- Throttling global + throttles específicos de auth

---

## Regras de Negócio

### Usuários e membros
- Email e `taxIdentifier` únicos entre usuários não deletados.
- Senha inicial = `taxIdentifier` (hash bcrypt).
- Usuário global recebe memberships nas orgs informadas com `globalRoleId` também como `roleId` do membro.
- `first-access` só altera senha se `isFirstAccess === true`.
- Forgot password não revela se o e-mail existe.
- Reset marca todos os tokens do e-mail como `used`.
- Campos `city` e `uf` (enum UF) existem no schema/DTOs.

### Roles e permissões
- Role `isSystem` não pode ser removida.
- Role vinculada a membros não pode ser removida.
- Módulo com `RolePermission` vinculada não pode ser removido.
- `@RequirePermission('users', 'read')` vira metadata `users:read`; action é normalizada para uppercase no guard.
- ADMIN global com permissão pode bypassar membership; caso contrário exige `Member` na org do header.

### Categorias
- Slug gerado a partir do nome; unicidade por organização/`slugPath` e por parent.
- `order` único entre irmãos (`organizationId + parentId + order`).
- Não pode ser filha de si mesma nem de descendentes.
- Soft delete recursivo (categoria + filhos).
- Pode ter `hasExternalLink` / `externalLink`.
- Árvore do portal filtra por `CategoryRoleAccess` (+ ancestrais); admin global vê tudo.

### Materiais
- Categoria deve existir, estar ativa e pertencer à organização.
- Nome único por categoria (constraint `@@unique([categoryId, name])`).
- Soft delete usa principalmente `deletedAt` (**sem** `isDeleted` — ver ATENÇÃO no schema).
- Tags: normalização, dedupe case-insensitive, reuso/criação na organização.
- `requiresAcceptance`, `notifyUsers`, `hasExternalLink`, `hasTextCopy`, `isCustomizable` + `customization` (posição TOP/FOOTER e flags de campos).
- Aceite registra `MaterialAcceptance`; detalhe registra `MaterialView`; download registra `MaterialDownload`.
- Em create/update com aceite/notificação, jobs de e-mail são enfileirados por membro elegível.

### Banners / Social Highlights
- Create exige imagens mobile e desktop.
- Datas: `initialDate <= finishDate` quando ambas informadas.
- Soft delete com `isDeleted` + `deletedAt`.

### Tags
- Escopo por organização; `name` único dentro da org.
- Não remove se houver materiais associados. Buscas preservam um snapshot do nome e não bloqueiam a remoção.

### FAQ
- Escopo por organização; itens ligados a um FAQ; detalhe 1:1 com telefones/WhatsApp e imagem opcional.
- Scripts de sync criam FAQ padrão em orgs sem FAQ.

### E-mail
- Na prática dos use cases/processors, envio real ocorre quando `NODE_ENV === 'prod'`; em `dev` costuma apenas logar.

---

## Autenticação

### Headers obrigatórios (rotas privadas)

```http
x-api-key: <SERVER_AUTH_SECRET>
Authorization: Bearer <accessToken>
x-organization-id: <organizationUuid>   # na maioria das rotas multi-tenant
```

### Fluxo de login

1. `POST /api/auth/sign-in` com `{ email, password }`
2. Valida credenciais (usa dummy hash quando user não existe, para mitigar timing; ver débitos se houver vazamento via NotFound)
3. Emite `accessToken` e `refreshToken` com payload `{ id, jti }`
4. Retorna também `canAccessBackoffice`
5. Se usuário **não** tem acesso a backoffice, registra login de plataforma (`UserPlatformLogin` / events)

### Refresh / Logout

- Refresh: valida refresh secret, checa blacklist, revoga refresh antigo, emite novo par.
- Logout: blacklista access (header) e refresh (body) quando possuem `jti`.
- Blacklist vive no **CacheService em memória** → não sobrevive a restart e não é compartilhada entre réplicas.

### AuthGuard

1. `@Public()` → libera
2. Senão exige `x-api-key` (compare timing-safe)
3. OPTIONS liberado após API key
4. Verifica JWT access; se `jti` blacklisted → 401
5. Anexa payload em `request.user`

### PlatformPermissionGuard

1. Lê `@RequirePermission` (`module:action`)
2. Busca user ativo com `globalRole.canAccessBackoffice` + permission
3. Se ADMIN global com permissão → ok
4. Senão exige membership na org do header com role que também tenha a permissão

### CategoryPermissionGuard

Protege acesso à árvore por slug com base em `CategoryRoleAccess` / path.

---

## Rotas da API

Todas sob `/api`, exceto `/docs` e `/reference` (não-prod, fora do prefixo).  
**Auth** resume: `Público` | `JWT+API` | `JWT+API+Org` | `+Permission` | guards especiais.

### App / Health / Metrics

| Método | Rota | Descrição | Auth |
|---|---|---|---|
| GET | `/` | Mensagem do AppService | Público |
| GET | `/file?path=` | URL assinada S3 | Público |
| GET | `/file/:path` | URL assinada S3 | Público |
| GET | `/health` | Health completo | Público |
| GET | `/health/live` | Liveness | Público |
| GET | `/health/ready` | Readiness | Público |
| GET | `/metrics` | Prometheus | Público |

### Auth (`/auth`)

| Método | Rota | Descrição | Auth |
|---|---|---|---|
| POST | `/auth/sign-in` | Login | Público + throttle login |
| POST | `/auth/refresh` | Renova tokens | Público |
| POST | `/auth/logout` | Blacklist tokens | Público |
| POST | `/auth/first-access` | Define senha 1º acesso | JWT+API (**middleware de org aplica**) |
| POST | `/auth/forgot-password` | Solicita reset | Público + throttle |
| POST | `/auth/verify-token` | Valida token reset | Público + throttle |
| POST | `/auth/reset-password` | Reseta senha | Público + throttle |

Payloads principais:
- Login: `{ email, password }`
- Refresh/Logout: `{ refreshToken }`
- First access: `{ newPassword }`
- Forgot: `{ email }`
- Verify: `{ token, email }`
- Reset: `{ token, email, password }` (senha forte: ≥8, maiúscula, minúscula, número)

### Organizations

| Método | Rota | Descrição | Auth |
|---|---|---|---|
| GET | `/organizations` | Lista | `organizations:READ` |
| GET | `/organizations/select` | Select | `organizations:READ` + org |
| GET | `/organizations/accessible` | Orgs do usuário | JWT+API |
| GET | `/organizations/:id` | Detalhe + avatarUrl | `organizations:READ` |
| POST | `/organizations` | Cria (+ avatar opcional) | `organizations:CREATE` |
| PATCH | `/organizations/:id` | Atualiza | `organizations:UPDATE` |
| DELETE | `/organizations/:id` | Desativa | `organizations:DELETE` |

### Users

| Método | Rota | Descrição | Auth |
|---|---|---|---|
| GET | `/users` | Lista | `users:READ` + `@OrgId` |
| GET | `/users/me` | Perfil autenticado | JWT+API |
| GET | `/users/global/select` | Select globais | `users:READ` + org |
| GET | `/users/select` | Select p/ members | `members:CREATE` + org |
| GET | `/users/:id` | Detalhe | `users:READ` |
| POST | `/users` | Cria na org | `users:CREATE` + org |
| POST | `/users/global` | Cria global | `users:CREATE` |
| PATCH | `/users/:id` | Atualiza | `users:UPDATE` + org |
| DELETE | `/users/:id` | Soft delete | `users:DELETE` |

### Members

| Método | Rota | Descrição | Auth |
|---|---|---|---|
| GET | `/members` | Lista | `members:READ` + org |
| GET | `/members/me` | Role do member | JWT+API+Org |
| GET | `/members/role` | Role + permissões/categorias | JWT+API+Org |
| GET | `/members/important-dates` | Datas importantes | JWT+API+Org |
| GET | `/members/:id` | Detalhe | `members:READ` + org |
| POST | `/members/new` | Cria user+member | `members:CREATE` + org |
| POST | `/members/add` | Adiciona user existente | `members:CREATE` + org |
| PATCH | `/members/:id` | Atualiza | `members:UPDATE` + org |
| DELETE | `/members/:id` | Remove | `members:DELETE` + org |

### Roles / Modules

| Método | Rota | Descrição | Auth |
|---|---|---|---|
| GET | `/roles` | Lista roles | `roles:READ` |
| GET | `/roles/select` | Select org | `roles:READ` + org |
| GET | `/roles/global/select` | Select globais | `roles:READ` |
| GET | `/roles/global/:id` | Role global | `roles:READ` |
| GET | `/roles/permissions` | Roles org + categorias | `roles:READ` + org |
| GET | `/roles/:id` | Role org | `roles:READ` + org |
| POST | `/roles` | Cria role **global** | `roles:CREATE` |
| PATCH | `/roles/global/:id` | Atualiza global | `roles:UPDATE` |
| DELETE | `/roles/global/:id` | Remove global | `roles:DELETE` |
| POST | `/roles/permissions` | Cria role **org** | `roles:CREATE` + org |
| PATCH | `/roles/:id` | Atualiza role org | `roles:UPDATE` + org |
| DELETE | `/roles/:id` | Remove role org | `roles:DELETE` + org |
| GET/POST/PATCH/DELETE | `/modules` (+ `/select`, `/:id`) | CRUD módulos RBAC | permissões via módulo `roles` |

### Categories / Category Role Access

| Método | Rota | Descrição | Auth |
|---|---|---|---|
| GET | `/categories` | Lista | `categories:READ` + org |
| GET | `/categories/tree` | Árvore do usuário | JWT+API+Org |
| GET | `/categories/tree/:slug` | Árvore por slug | CategoryPermissionGuard + org |
| GET | `/categories/*slugPath/materials` | Materiais por path | JWT+API+Org (PlatformPermissionGuard sem RequirePermission) |
| GET | `/categories/:id` | Detalhe | `categories:READ` + org |
| POST | `/categories` | Cria | `categories:CREATE` + org |
| PATCH | `/categories/:id` | Atualiza | `categories:UPDATE` + org |
| DELETE | `/categories/:id` | Soft delete recursivo | `categories:DELETE` + org |
| GET | `/category-role-accesses` | Lista vínculos | `categories:READ` + org |
| GET | `/category-role-accesses/category/:categoryId/roles` | Roles da categoria | `categories:READ` + org |
| POST | `/category-role-accesses` | Cria vínculo | `categories:UPDATE` + org |
| DELETE | `/category-role-accesses/:id` | Remove vínculo | `categories:UPDATE` + org |

### Calendar

| Método | Rota | Descrição | Auth |
|---|---|---|---|
| GET | `/calendar/event-types` | Lista legendas da org (sem filtro de role) | JWT+API+Org |
| GET | `/calendar/event-types/:id` | Detalhe da legenda | JWT+API+Org |
| POST | `/calendar/event-types` | Cria legenda | `calendar:CREATE` + org + backoffice |
| PATCH | `/calendar/event-types/:id` | Atualiza legenda | `calendar:UPDATE` + org + backoffice |
| DELETE | `/calendar/event-types/:id` | Soft delete (409 se houver eventos ativos) | `calendar:DELETE` + org + backoffice |
| GET | `/calendar/events` | Lista eventos com filtro de visibilidade | JWT+API+Org |
| GET | `/calendar/events/:id` | Detalhe (404 se sem acesso à categoria) | JWT+API+Org |
| POST | `/calendar/events` | Cria evento | `calendar:CREATE` + org + backoffice |
| PATCH | `/calendar/events/:id` | Atualiza (incl. `categoryId: null`) | `calendar:UPDATE` + org + backoffice |
| DELETE | `/calendar/events/:id` | Soft delete | `calendar:DELETE` + org + backoffice |

Visibilidade de eventos: `canAccessBackoffice=true` vê todos; caso contrário, só eventos sem `categoryId` ou com `categoryId` em `categoryRoleAccesses` do membro.

### Materials

| Método | Rota | Descrição | Auth |
|---|---|---|---|
| GET | `/materials` | Lista admin | `materials:READ` + org |
| GET | `/materials/most-accessed` | Portal | JWT+API+Org |
| GET | `/materials/mosaic` | Portal | JWT+API+Org |
| GET | `/materials/search` | Busca portal + tracking idempotente por `searchId` | JWT+API+Org |
| GET | `/materials/:id/download` | Download/URLs + tracking | JWT+API+Org |
| GET | `/materials/:id/details` | Detalhe + view | JWT+API+Org |
| GET | `/materials/:id` | Detalhe admin | `materials:READ` + org |
| GET | `/materials/:id/acceptance/export` | Enfileira export CSV (202) | `materials:READ` + org |
| POST | `/materials/:id/acceptance` | Aceita/rejeita termo | JWT+API+Org |
| GET | `/materials/:id/files` | Lista arquivos | `materials:READ` + org |
| POST | `/materials` | Cria (+ files/tags) | `materials:CREATE` + org |
| POST | `/materials/:id/files` | Upload files | `materials:UPDATE` + org |
| PATCH | `/materials/:id` | Atualiza | `materials:UPDATE` + org |
| DELETE | `/materials/:id` | Soft delete | `materials:DELETE` + org |
| DELETE | `/materials/:id/files/:fileId` | Remove arquivo | `materials:UPDATE` + org |

Create material (campos relevantes): `name`, `categoryId`, `description?`, `tags?`, `requiresAcceptance?`, `notifyUsers?`, `hasExternalLink?`, `externalLink?`, `hasTextCopy?`, `textCopy?`, `isCustomizable?`, `customization?`, `roleId?` + multipart.

### Banners / Social Highlights

Mesmo padrão CRUD:

| Recurso | Base | List portal | Permission module |
|---|---|---|---|
| Banners | `/banners` | `GET /banners/list` | `banners` |
| Social Highlights | `/social-highlights` | `GET /social-highlights/list` | `social-highlights` |

Create: `name`, `order`, `link?`, `isActive?`, `initialDate?`, `finishDate?` + files `desktopImage`/`mobileImage` (obrigatórios no create).

### FAQs

| Método | Rota | Descrição | Auth |
|---|---|---|---|
| GET | `/faqs/list` | Lista admin | `faqs:READ` + org |
| GET | `/faqs` | FAQ portal | JWT+API+Org |
| GET/POST | `/faqs/items` | Lista/cria items | READ/CREATE |
| GET/PATCH/DELETE | `/faqs/items/:itemId` | CRUD item | READ/UPDATE/DELETE |
| POST | `/faqs` | Cria FAQ | `faqs:CREATE` |
| PATCH/DELETE | `/faqs/:id` | Atualiza/remove | UPDATE/DELETE |
| PUT | `/faqs/:id/detail` | Upsert detalhe (+ imagem) | `faqs:UPDATE` |

### Tags

| Método | Rota | Descrição | Auth |
|---|---|---|---|
| GET | `/tags` | Lista | `tags:READ` + org |
| GET | `/tags/select` | Select | `tags:READ` + org |
| GET | `/tags/:id` | Detalhe | `tags:READ` + org |
| POST | `/tags` | Cria | `tags:CREATE` + org |
| PATCH | `/tags/:id` | Atualiza | `tags:UPDATE` + org |
| DELETE | `/tags/:id` | Remove | `tags:DELETE` + org |

### Reports (todas `reports:READ` + org)

| Método | Rota | Descrição |
|---|---|---|
| GET | `/reports/users/top-logins` | Top logins |
| GET | `/reports/users/top-logins/export` | Export async (202) |
| GET | `/reports/users/top-downloads` | Top downloads por user |
| GET | `/reports/users/top-downloads/export` | Export async |
| GET | `/reports/materials/top-views` | Top views |
| GET | `/reports/materials/top-views/export` | Export async |
| GET | `/reports/materials/top-downloads` | Top downloads materiais |
| GET | `/reports/materials/top-downloads/export` | Export async |
| GET | `/reports/searches/top` | Top buscas |
| GET | `/reports/searches/top/export` | Export async |

**Total aproximado:** ~125 rotas HTTP.

Coleção Postman: `Central de Midias.postman_collection.json`.

---

## Banco de Dados

ORM: **Prisma** · Provider: **PostgreSQL** · Schema: `prisma/schema.prisma`

### Entidades principais

| Model | Tabela | Responsabilidade |
|---|---|---|
| `User` | `users` | Conta, senha, documento, contato, avatar, city/uf, soft delete, `globalRole` |
| `UserHierarchy` | `user_hierarchies` | Gestor ↔ subordinado por org |
| `UserPlatformLogin` | `user_platform_logins` | Último login portal |
| `UserPlatformLoginEvent` | `user_platform_login_events` | Histórico de logins |
| `PasswordResetToken` | `password_reset_tokens` | Tokens de reset |
| `Role` | `roles` | Perfis (sistema/backoffice/subordinados) |
| `Module` | `modules` | Recursos RBAC (`users`, `materials`, …) |
| `RolePermission` | `role_permissions` | Role + Module + Action |
| `Member` | `members` | User ↔ Organization ↔ Role |
| `Organization` | `organizations` | Tenant |
| `Category` | `categories` | Menu hierárquico + `slugPath` |
| `CategoryRoleAccess` | `category_role_accesses` | Role × categoria × org |
| `CalendarEventType` | `calendar_event_types` | Legendas/tipos de evento do calendário |
| `CalendarEvent` | `calendar_events` | Eventos do calendário (vínculo opcional a categoria) |
| `Banner` | `banners` | Banners com keys de imagem |
| `SocialHighlight` | `social_highlights` | Destaques “Tá na Rede” |
| `Faq` / `FaqItem` / `FaqDetail` | `faqs` / `faq_items` / `faq_details` | FAQ por org |
| `Material` | `materials` | Conteúdo (soft delete incompleto) |
| `MaterialCustomization` | `material_customizations` | Flags de customização |
| `MaterialAcceptance` | `material_acceptances` | Aceite de termo |
| `MaterialView` | `material_views` | Visualizações |
| `MaterialDownload` | `material_downloads` | Downloads |
| `MaterialFile` | `material_files` | Arquivos do material |
| `Tag` | `tags` | Tags por org |
| `TagSearch` | `tag_searches` | Eventos de busca por tag, organização e usuário |
| `Log` | `logs` | Logs persistidos |
| `SeedStatus` | `seed_status` | Controle de seed |

### Relacionamentos críticos

- `Organization` 1:N `Member`, `Category`, `Banner`, `SocialHighlight`, `Tag`, `Faq`, `CategoryRoleAccess`, `UserHierarchy`
- `User` N:1 `Role` (global) e 1:N `Member`
- `Category` árvore via `parentId`; 1:N `Material`
- `Material` N:N `Tag`; 1:N files/views/downloads/acceptances; 1:1 customization

### Seed

`prisma/seed.js` (idempotente via `seed_status.id = main-seed`):

- Cria modules: `organizations`, `roles`, `users`, `members`, `categories`, `banners`, `social-highlights`, `materials`, `tags`, `reports`, `faqs`, `calendar`
- Role `ADMIN` sistêmica com todas as actions
- User `admin@admin.com` (senha hardcoded no seed; `isFirstAccess=false`)
- **Não cria Organization/Member** — o próprio seed avisa que o admin pode falhar no `PlatformPermissionGuard` sem membership/org

Scripts auxiliares:

- `npm run db:sync-faqs` — FAQ padrão em orgs sem FAQ
- `npm run db:sync-global-roles` — `CategoryRoleAccess` para roles backoffice × orgs

Há também diagramas: `cmo_schema.dbml` / `cmo_schema.dbdiagram`.

---

## Filas (BullMQ)

Redis é **obrigatório para filas** (não para o cache de aplicação).

| Fila | Job | Função |
|---|---|---|
| `material-acceptance-email` | `send-email` | E-mail de confirmação de leitura/aceite |
| `material-acceptance-export` | `send-export` | CSV de aceites + e-mail |
| `material-notification-email` | `send-email` | Notificação de novo material |
| `report-export` | `send-export` | CSV de relatório + e-mail |

Opções padrão: 5 attempts, backoff exponencial 5s, `removeOnComplete: true`, `removeOnFail: false`.

---

## Upload e Storage

### Upload

- Middleware global: `multer.memoryStorage()`, limite bruto ~100 MB/arquivo (depois interceptors).
- Validação global de tipo (`FileTypeValidationInterceptor`) e tamanho (`FileSizeValidationInterceptor`, default 5 MB; `@MaxFileSize` sobrescreve).
- Extensões: PNG, JPEG, PDF, DOC/DOCX, MP4, MP3, PPT/PPTX, EPS, XLS/XLSX.

### Storage

- Facade `StorageService` usa **somente** `S3StorageService`.
- `uploadFile` / `getPublicUrl` (signed) / `getDownloadUrl` → S3 real.
- **`deleteFile` da facade apenas faz `console.log`** — não apaga objetos no S3.
- `SupabaseService` e `LocalStorageService` existem, mas estão comentados/inativos na facade.

Variáveis S3 usadas em runtime (não validadas pelo Joi): `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET`, `S3_PRESIGNED_EXPIRES_SECONDS`.

---

## Integrações Externas

| Integração | Uso |
|---|---|
| PostgreSQL | Persistência via Prisma (`DATABASE_URL`) |
| Redis | BullMQ only |
| AWS S3 | Upload e URLs assinadas |
| SMTP | E-mails (obrigatório em `prod` via Joi; envio efetivo nos use cases tipicamente só em prod) |
| Prometheus | `/api/metrics` |
| Grafana | Dashboard em `docker/observability` (compose dev) |
| Supabase Storage | Código presente, **não ativo** |
| Sentry | Citado em security logger, **sem integração efetiva** no código analisado |

Templates de e-mail (Pug): `welcome`, `reset-password`, `material-acceptance`, `material-notification`, `material-acceptance-export`, `report-export`.

---

## Middlewares / Guards / Interceptors

| Tipo | Nome | Escopo |
|---|---|---|
| Middleware | `requestIdMiddleware` | Global |
| Middleware | `multipartMiddleware` | Global (`main.ts`) |
| Middleware | `OrganizationMiddleware` | Quase todas as rotas (com exclusões em `AppModule`) |
| Guard | `AuthGuard` | APP_GUARD |
| Guard | `ThrottlerGuard` | APP_GUARD |
| Guard | `PlatformPermissionGuard` | Controllers/métodos backoffice |
| Guard | `CategoryPermissionGuard` | Árvore por slug |
| Filter | `HttpExceptionFilter` | APP_FILTER |
| Interceptor | `HoneypotFieldInterceptor` | Global |
| Interceptor | `MetricsInterceptor` | Global |
| Interceptor | `FileTypeValidationInterceptor` | Global |
| Interceptor | `FileSizeValidationInterceptor` | Global |

Decorators relevantes: `@Public`, `@RequirePermission`, `@OrgId`, `@UserId`, `@MaxFileSize`, `@ThrottleLogin`, `@ThrottleTokenGeneration`, `@ThrottlePasswordReset`, `@Sanitize`.

---

## Variáveis de Ambiente

### Obrigatórias (Joi)

```text
NODE_ENV=dev|prod          # default: dev
JWT_SECRET
JWT_EXPIRES
JWT_REFRESH_SECRET
JWT_REFRESH_EXPIRES
PORT                       # default: 4000
DATABASE_URL
SERVER_AUTH_SECRET
```

### Obrigatórias somente em `prod`

```text
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASS
SMTP_FROM
FRONTEND_URL
```

### Opcionais / usadas em runtime

```text
ALLOWED_ORIGINS
TOKEN_PASSWORD_EXPIRES_MINUTES   # default 15
REDIS_HOST                       # default localhost
REDIS_PORT                       # default 6379
REDIS_PASSWORD
POSTGRES_USER / POSTGRES_PASSWORD / POSTGRES_DB
AWS_REGION
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
S3_BUCKET
S3_PRESIGNED_EXPIRES_SECONDS
SUPABASE_URL / SUPABASE_KEY / SUPABASE_BUCKET / ...  # legado, provider inativo
```

> Não há `.env.example` versionado de forma completa no repositório (há `.env` local). **Não commitar segredos.** Existe também chave `.pem` no root — tratar como risco.

---

## Como Rodar

### Pré-requisitos

- Node.js 20+ (CI) / 22 (Docker)
- PostgreSQL
- Redis (para filas BullMQ)
- Credenciais S3 (para uploads reais)

### Instalação

```bash
npm install
# ou yarn (há yarn.lock e package-lock.json; CI usa npm)
```

### Prisma

```bash
npm run prisma:generate
npm run db:deploy    # migrate deploy + seed
# ou
npm run db:seed
```

### Desenvolvimento

```bash
npm run dev
```

API: `http://localhost:4000/api`  
Docs: `http://localhost:4000/docs` · `http://localhost:4000/reference`

### Docker

```bash
# produção-like
docker compose up --build

# desenvolvimento + observabilidade
docker compose -f docker-compose.dev.yml up --build
```

Compose sobe Redis + app. Dev adiciona Prometheus (9090) e Grafana (3001).

---

## Scripts Disponíveis

| Script | Descrição |
|---|---|
| `npm run build` | Build Nest → `dist` |
| `npm run start` | Nest sem watch |
| `npm run dev` | Watch mode |
| `npm run start:debug` | Debug + watch |
| `npm run start:prod` | `node dist/main` |
| `npm run lint` | ESLint `--fix` |
| `npm run format` | Prettier |
| `npm run test` | Unitários |
| `npm run test:watch` | Jest watch |
| `npm run test:cov` | Cobertura |
| `npm run test:e2e` | E2E (`test/jest-e2e.json`) |
| `npm run validate:push` | test + e2e + build |
| `npm run prisma:generate` | Prisma Client |
| `npm run db:deploy` | migrate deploy + seed |
| `npm run db:seed` | Seed |
| `npm run db:sync-faqs` | Sync FAQs |
| `npm run db:sync-global-roles` | Sync CategoryRoleAccess backoffice |

Husky é instalado via `prepare`.

---

## Build e Deploy

### Build

```bash
npm run build
```

Saída em `dist/`. Em produção Docker o entrypoint executa `db:deploy` e depois `node dist/src/main.js`.

### Dockerfile

- Multi-stage Node 22 Alpine
- `prisma generate` + `build` + prune
- Runtime: `dumb-init`, `openssl`, user `node`, `EXPOSE 4100`
- Copia templates Pug para `dist/src/infrastructure/providers/mail/templates`

### CI

`.github/workflows/ci.yml` — PRs para `main`/`develop`:

```text
npm ci → lint → test → test:e2e → build
```

Sem pipeline de deploy automatizado no workflow atual.

### Terraform

`terraform/` provisiona containers Docker (Postgres + app) com provider `kreuzwerker/docker`.

---

## Testes

- Unitários: `src/**/*.spec.ts` (Jest, `rootDir: src`)
- E2E: `test/e2e/*` — auth, users, orgs, members, roles, modules, categories, materials, banners, social-highlights, tags, calendar, health, metrics, security, category-role-access
- Mocks de aliases em `src/test-utils`
- Cobertura ignora modules, DTOs, entities, exceptions, `main.ts`, templates, etc.
- Relatório adicional: `TESTS_AUDIT_REPORT.md`

```bash
npm run test
npm run test:e2e
npm run test:cov
```

---

## Convenções do Projeto

1. Aliases TS: `@common/*`, `@infrastructure/*`, `@modules/*`
2. Padrão de feature: `dto → controller → use-case → repository`
3. Regras de negócio no use case; validação de input no DTO
4. Queries multi-tenant **sempre** filtradas por `organizationId`
5. Soft delete: conferir se a entidade usa `isDeleted`, `deletedAt` ou ambos (Material é exceção)
6. Permissões: usar nomes de `modules.name` seedados (`materials`, `faqs`, `reports`, …)
7. Uploads: confiar no multipart global; usar `@UploadedFile(s)` + `@MaxFileSize` quando necessário
8. Strings de input: preferir `@Sanitize()` onde já usado no projeto
9. IDs: `uuid` via helpers (`generateId`), embora Prisma tenha defaults
10. E-mails: considerar `NODE_ENV === 'prod'` antes de assumir envio real
11. Novos jobs: registrar fila em `QueueModule` + constants + processor no módulo de domínio
12. Mistura `npm`/`yarn`: preferir **npm** (CI)

---

## Pontos Críticos / Débitos Técnicos

Documentados a partir do código real (não inventados):

1. **`StorageService.deleteFile` é no-op** (só log) — objetos S3 não são removidos nas exclusões.
2. **Cache/blacklist em memória** enquanto Redis só alimenta BullMQ — logout não escala horizontalmente e some no restart.
3. **Soft delete de `Material` incompleto** (comentário ATENÇÃO no schema: falta alinhar `isDeleted` + queries).
4. **Seed sem Organization/Member** — admin global pode não passar em rotas que exigem membership.
5. **Variáveis AWS/S3 fora do Joi** — app sobe sem elas, mas upload falha no construtor/uso do S3.
6. **`POST /auth/first-access` exige org middleware** (não está nas exclusões), apesar de ser fluxo de senha.
7. **Possível e-mail `welcome` duplicado** em `CreateMemberWithUser` (chama create user + envia welcome de novo).
8. **Healthcheck Docker** testa `:4000` enquanto Dockerfile `EXPOSE 4100` — risco de mismatch conforme `PORT`.
9. **Segredos no repositório**: `.env`, `.pem` — risco alto; rotacionar e remover do versionamento.
10. **Sentry não efetivo**; Supabase storage morto na facade.
11. **`UserHierarchy` / `managerAssignments`**: schema existe; persistência completa deve ser validada antes de assumir suporte total.
12. Entrypoint `.docker/entrypoint.dev.sh` pode referenciar scripts inexistentes no `package.json` (validar antes de usar).
13. Strict TypeScript desligado (`strictNullChecks: false`, etc.).

Inconsistências antigas citadas em `DOC.md` (ex.: raw SQL com nomes errados, `platformUserOrganizations`) devem ser **revalidadas no código atual** antes de assumir que ainda existem — o repositório evoluiu (ex.: `findTreeBySlugPath`).

---

## Melhorias Recomendadas

- Implementar `deleteFile` real na facade S3.
- Adapter Redis para cache/blacklist (ou documentar single-instance).
- Completar soft delete de Material (`isDeleted` + queries).
- `.env.example` completo; remover segredos do git; rotacionar credenciais.
- Validar AWS/S3 no Joi quando storage ativo.
- Excluir `first-access` do OrganizationMiddleware ou documentar header obrigatório.
- Padronizar soft delete entre entidades.
- Alinhar PORT/EXPOSE/healthcheck Docker.
- Evitar double welcome e-mail.
- Expandir e2e para FAQ, reports e filas (mock Redis).
- Remover providers mortos ou reativá-los conscientemente.

---

## Observações para Futuras Implementações

- Antes de criar módulo novo de backoffice: seedar `Module` + permissions na role adequada.
- Portal vs backoffice: rotas de portal autenticadas **sem** `@RequirePermission`; backoffice **com**.
- Qualquer listagem tenant-scoped deve falhar fechado se `organizationId` ausente.
- Exports retornam **202** e processam async — não bloquear request gerando CSV grande.
- Ao alterar auth/RBAC: rodar `test` + `test:e2e` + `build`.
- Ao alterar schema: migration Prisma + revisar seed/sync scripts + entidades TypeScript.
- Collection Postman e Scalar/Swagger ajudam, mas o código dos controllers manda.

---

## Resumo para IA

### Como a aplicação funciona de ponta a ponta

Cliente chama `/api/*` com `x-api-key` + JWT (+ `x-organization-id`). Guards/middlewares autenticam e autorizam. Controller chama use case; use case aplica regra e chama repository Prisma e/ou Storage/Mail/Queue. Resposta HTTP retorna; side effects (e-mail/CSV) podem ser assíncronos via BullMQ.

### Fluxos críticos

1. **Auth** — sign-in / refresh / logout / blacklist / first-access / reset
2. **RBAC** — `Role` + `Module` + `RolePermission` + `Member` + `PlatformPermissionGuard`
3. **Categoria** — hierarquia + `CategoryRoleAccess` + árvore portal
4. **Material** — CRUD + files S3 + tags + aceite/view/download + filas de e-mail
5. **Banner/SocialHighlight** — imagens dual + vigência
6. **Reports/Exports** — query + enqueue + CSV + e-mail

### O que considerar antes de alterar

- A rota é pública, portal ou backoffice?
- Precisa de org header? Está excluída do middleware?
- Qual `modules.name` e action?
- Soft delete: quais campos?
- Upload: multipart global já parseou?
- Delete de arquivo: facade **não** apaga S3 hoje
- E-mail só é confiável em `prod`
- Cache de token é memória

### Dependências críticas

PostgreSQL, Redis (filas), S3 (arquivos), SMTP (prod), JWT secrets, `SERVER_AUTH_SECRET`.

### Como implementar feature sem quebrar

1. Seguir `dto → controller → use-case → repository`
2. Registrar módulo em `AppModule` se novo
3. Seedar permissões se backoffice
4. Filtrar por `organizationId`
5. Escrever spec do use case/repository
6. Se async: fila em `QueueModule` + processor
7. Rodar `npm run test && npm run test:e2e && npm run build`

### Maior acoplamento / cuidado

| Área | Motivo |
|---|---|
| User ↔ Member ↔ Role ↔ Organization ↔ PlatformPermissionGuard | Autorização central |
| Category ↔ CategoryRoleAccess ↔ CategoryPermissionGuard | Menu e acesso |
| Material ↔ Tag ↔ Storage ↔ Queues | Conteúdo + side effects |
| Auth ↔ Cache blacklist ↔ JWT ↔ TokenPassword | Sessão |
| Reports ↔ MaterialView/Download/Login/TagSearch ↔ Queue | Métricas e export |

### Convenções importantes para IA

- Não inventar endpoints; conferir controllers.
- Não assumir Redis no cache.
- Não assumir que `deleteFile` remove do S3.
- Não confundir módulo Nest com entidade `Module` (RBAC).
- Preferir código como fonte da verdade sobre `DOC.md` antigo.
- Responder e documentar apenas o que existir no código.

---

## Licença

Pacote privado (`UNLICENSED`).
