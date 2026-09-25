# Relatório consolidado — Central de Mídias Omni API

**Data:** 2026-09-09  
**Método:** deduplicação por falha de controlo; verificação pontual no código; classificação por evidência, **não** por acordo entre modelos.  
**Não** foi feita nova auditoria geral. **Nenhum código foi alterado.**

**Fontes usadas**

| Ficheiro               | Modelo                    |
| ---------------------- | ------------------------- |
| `architecture-grok.md` | Grok (mapa, não findings) |
| `security-grok.md`     | Grok (CM-01…CM-12)        |
| `reliability-grok.md`  | Grok (IR-01…IR-10)        |
| `security-opus.md`     | Opus (CMO-01…CMO-10)      |
| `security-sol.md`      | Sol (Findings 1–8)        |

Não há `architecture-opus/sol` nem `reliability-opus/sol`. Fiabilidade abaixo é só Grok, reaberta no código na consolidação anterior.

---

## P0 — acionável agora

| ID      | Finding                                                             | Estado     | Sev.    | Quem reportou       |
| ------- | ------------------------------------------------------------------- | ---------- | ------- | ------------------- |
| CONS-02 | `GET /api/file` assina qualquer key sem auth                        | Confirmado | Crítica | Grok, Opus, Sol     |
| CONS-03 | IDOR `GET/PATCH/DELETE /users/:id` (PII + takeover)                 | Confirmado | Crítica | Grok, Opus, Sol     |
| CONS-04 | Multipart em memória **antes** do AuthGuard; ilimitado em materiais | Confirmado | Alta    | Grok (parcial), Sol |

---

### CONS-02 — Assinatura anónima de object storage

**Estado:** Confirmado · **Severidade:** Crítica · **Prioridade:** P0  
**Grok CM-01 · Opus CMO-01 · Sol Finding 1**

`AppController` é `@Public()`. `GET /file` e `GET /file/:key` passam `path` a `StorageService.getPublicUrl` → `getSignedUrl(key)` **sem** lookup de `File`, material, org ou utilizador.

**Refutação tentada:** keys UUID não enumeráveis; bucket já público; org middleware na variante `?path=`. Falhou: a API **emite** a signed URL do bucket privado; keys vazam em respostas; middleware de org, quando corre, só exige org ativa.

**Impacto:** leitura de qualquer objeto cuja key se conheça — materiais, avatares, exports, documentos.

Bind `127.0.0.1` no compose de prod reduz internet aberta; **não** refuta o bug.

---

### CONS-03 — Utilizador global sem bound de org

**Estado:** Confirmado · **Severidade:** Crítica · **Prioridade:** P0  
**Grok CM-03 + CM-04 · Opus CMO-02 · Sol Finding 3**

JWT + `users:read|update|delete` **na org do header** → controller usa só `:id` → `UserRepository` filtra `{ id, isDeleted: false }` **sem** membership. `UpdateUserDTO` inclui `password`, `globalRoleId`, `isFirstAccess`, `isActive`.

**Refutação tentada:** “só ADMIN chega aqui”; “password no PATCH é ignorada”. Falhou: o guard resolve a permissão pela `Member.role` da org do header; o repositório persiste `data.password`.

Grok marcou Alta; Opus/Sol Crítica. A evidência de código sustenta **Crítica**: takeover de qualquer conta, inclusive ADMIN, por um operador com `users:update` numa única org.

**Mesmo modelo User, impacto menor (não duplicar como P0):** `MemberRepository.update` altera `User` (email, CPF, nome) sem `organizationId` no `where` do user — Confirmado, **Alta / P1**.

---

### CONS-04 — DoS de memória no parser multipart

**Estado:** Confirmado · **Severidade:** Alta · **Prioridade:** P0  
**Grok CM-08 (subestimado) · Sol Finding 7**

`app.use(multipartMiddleware)` corre **antes** dos guards. `memoryStorage()`. POST de material usa `unlimitedUpload` (sem `fileSize`).

**Correção a Grok:** **não** exige `materials:create`. AuthGuard corre _depois_ do buffer. POST sem JWT para `/api/materials` já aloca memória e só então leva 401.

**Refutação tentada:** throttle / interceptor de tamanho. Falhou: interceptors correm após o parse; throttle limita pedidos, não bytes.

**P0** porque um request pode OOM o processo Node. Exposição pública depende de como a API está publicada; o defeito no código é acionável.

Pixel bomb em assets (CONS-18) é **outro** finding: exige auth + `assets:create`.

---

## P1 — impacto sério e real

### CONS-05 — Portal sem membership na org do header

**Estado:** Confirmado · **Severidade:** Alta · **Prioridade:** P1  
**Grok CM-02 · Opus CMO-04 · Sol Finding 5**

`OrganizationMiddleware` só exige org existente e ativa. `PlatformPermissionGuard` sem `@RequirePermission` devolve `true`. `GET` de banners, FAQ, highlights e `GET /members/important-dates` não verificam `Member`.

**Reaberto:** `important-dates` devolve nome, aniversário/admissão e avatar assinado da org do header.

**Refutação tentada:** “o SPA só manda a org certa.” Falhou como controlo de servidor. UUID pode vir de URL, convite, `GET /organizations` (se o caller tiver `organizations:read`) ou outro tenant.

WebSocket com o mesmo header: **Possível** superfície extra (Sol); o gateway não foi reaberto nesta consolidação.

---

### CONS-06 — `POST /users/global` provisiona orgs arbitrárias

**Estado:** Confirmado · **Severidade:** Alta · **Prioridade:** P1  
**Opus CMO-03**

`organizationIds` do body não é intersectado com as orgs do caller. `users:create` na org do header basta para criar membership noutras orgs.

**Refutação tentada:** “só ADMIN usa esta rota.” Falhou: o decorator é `users:create`.

---

### CONS-07 — Permissão de org administra RBAC global

**Estado:** Confirmado · **Severidade:** Alta · **Prioridade:** P1  
**Sol Finding 4** (vizinho de Grok CM-04, não o mesmo controlo)

`POST /roles/global` e `PATCH /roles/global/:id` usam `@RequirePermission('roles','create'|'update')` avaliado na org do header. `UpdateGlobalRoleUseCase` **não** bloqueia `isSystem`; substitui `rolePermission` desse perfil.

**Refutação tentada:** “create local não mexe no global.” Irrelevante: as rotas `/global` existem com a mesma permissão org-scoped.

Quem tem `roles:update` numa org pode alterar o perfil ADMIN da plataforma — takeover **paralelo** a CONS-03.

---

### CONS-08 — Listagem de materiais por slug ignora CRA

**Estado:** Confirmado · **Severidade:** Alta · **Prioridade:** P1  
**Opus CMO-05 · Sol Finding 2**

`GET /categories/*slugPath/materials`: guard sem permissão; **não** passa `userId`; `findByCategorySlugPath` não chama `userHasCategoryAccess`. `CategoryPermissionGuard` lê `query.path`; nesta rota o slug é **param** → guard inerte.

Search/details/download/view **têm** CRA. Isto não é “backoffice vê tudo”.

**Refutação tentada:** “sem slug não há categoria”; “precisa `materials:read`.” Falhou: slugs são visíveis; não há `@RequirePermission`.

---

### CONS-09 — Logout/blacklist só no processo + fail-open

**Estado:** Confirmado · **Severidade:** Alta · **Prioridade:** P1  
**Grok CM-05 · Opus CMO-06 · Sol Finding 6 (cache)**

Cache-manager in-memory; Redis só para BullMQ. `jti` revogado não atravessa réplicas, worker nem restart. `CacheService.get` em `catch` devolve `null` → token tratado como não listado.

**Refutação tentada:** “uma instância em prod.” Falhou: API + worker; restart esvazia a lista; fail-open está no código.

---

### CONS-10 — `isActive` ignorado em login e refresh

**Estado:** Confirmado · **Severidade:** Alta · **Prioridade:** P1  
**Opus CMO-07 · Sol Finding 6 (conta)**

`findByEmail` / `findById` (auth) filtram `isDeleted: false`, não `isActive`.

**Refutação tentada:** “`isDeleted` cobre.” Falhou: campos distintos; o DTO de update expõe `isActive`.

Não fundir com CONS-09.

---

### CONS-11 — Senha inicial = CPF; first-access sem política no DTO

**Estado:** Confirmado · **Severidade:** Alta · **Prioridade:** P1  
**Grok CM-07** (Opus no contexto CMO-03)

Create user/member usa `password = taxIdentifier`. `isFirstAccess` e `password` são writable por `users:update` (sobreposto a CONS-03).

**Refutação tentada:** “first-access força troca.” Falhou como controlo no update.

---

### CONS-12 — Print export: QUEUED/FAILED sem job recuperável

**Estado:** Confirmado · **Severidade:** Alta · **Prioridade:** P1  
**Grok IR-04**

Persiste `QUEUED` **depois** tenta `queue.add`. Falha de Redis → 500 e linha órfã. Retry com a mesma `idempotencyKey` devolve o existente **sem** reenfileirar.

**Refutação tentada:** “BullMQ retry basta.” Falhou: o job pode nunca ter entrado na fila.

---

### CONS-13 — `user.create` fora do client da transação

**Estado:** Confirmado · **Severidade:** Alta · **Prioridade:** P1  
**Grok IR-03**

O callback de `$transaction` chama `this.prisma.user.create` e depois `tx.member.create`. Rollback de member **não** desfaz o user.

**Refutação tentada:** “o singleton participa da tx.” Falhou: operações no client exterior ao `tx` não entram nessa transação.

---

### CONS-14 — Banner: apaga S3 antigo **antes** do update na BD

**Estado:** Confirmado · **Severidade:** Alta · **Prioridade:** P1  
**Grok IR-02**

`deleteFile(oldKey)` → depois `bannerRepository.update`. Falha no update → BD aponta para key já apagada.

**Refutação tentada:** “só muda metadados.” Falhou no ramo que substitui `fileKey`.

---

## P2 — real, sem urgência imediata

| ID      | Finding                                                       | Estado     | Sev.  | Pri. | Modelos                           | Verificação                                                                                                                   |
| ------- | ------------------------------------------------------------- | ---------- | ----- | ---- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| CONS-15 | Reset 6 chars `Math.random`                                   | Confirmado | Média | P2   | Grok CM-12, Opus CMO-08           | Espaço ~2×10⁹; não é CSPRNG. Exige conhecer o email.                                                                          |
| CONS-16 | Enumeração de email no login                                  | Confirmado | Média | P2   | Grok CM-06 (**mecanismo errado**) | Miss → `FindUserByEmailUseCase` lança 404. Dummy bcrypt **não corre**. Dummy → 500: **Refutado**. 404 vs 401: **Confirmado**. |
| CONS-17 | Create banner/highlight/org: storage depois BD (órfãos S3)    | Confirmado | Média | P2   | Grok IR-01                        | Simétrico de CONS-14; lixo de storage.                                                                                        |
| CONS-18 | Magics de imagem sem cap de pixels                            | Confirmado | Média | P2   | Grok CM-09                        | Exige auth + `assets:create`. ≠ CONS-04.                                                                                      |
| CONS-19 | `GET /metrics` `@Public()`                                    | Confirmado | Média | P2   | Grok CM-10                        | Loopback em prod mitiga; o handler é público.                                                                                 |
| CONS-20 | `docker-compose.dev.yml` publica Redis `6379` e API `4000`    | Confirmado | Média | P2   | Grok CM-11                        | Compose **prod** não publica Redis. Risco se o compose **dev** for usado em host exposto.                                     |
| CONS-21 | Cache banners 15 min vs signed URL ~5 min; sem invalidate     | Confirmado | Média | P2   | Grok IR-05; Sol (nota)            | Stale/URLs mortas; não é IDOR.                                                                                                |
| CONS-22 | Enqueue e-mail/inbox com erro engolido                        | Confirmado | Média | P2   | Grok IR-06                        | Sucesso HTTP; notificação some.                                                                                               |
| CONS-23 | Worker: PDF até 250 MB; sem `enableShutdownHooks`             | Confirmado | Média | P2   | Grok IR-08                        | SIGTERM / job a meio.                                                                                                         |
| CONS-24 | Delete material: BD primeiro, S3 depois; `createFiles` sem tx | Confirmado | Média | P2   | Grok IR-09                        | Órfãos ou BD sem blob.                                                                                                        |
| CONS-25 | Reports `LIMIT` até `MAX_SAFE_INTEGER`; SMTP sem timeout      | Confirmado | Média | P2   | Grok IR-10                        | DoS interno / hung.                                                                                                           |
| CONS-26 | Retry SMTP 5×                                                 | Confirmado | Média | P2   | Grok IR-07                        | Duplicados se o provider aceitou e a ACK falhou.                                                                              |
| CONS-27 | Throttle + `trust proxy` + `X-Forwarded-For`                  | Provável   | Média | P2   | Opus CMO-09                       | Código confirma `trust proxy`. Exploração depende do proxy **não** reescrever XFF.                                            |
| CONS-28 | `GET /materials/:id/files` e export de aceite sem CRA         | Provável   | Média | P2   | Sol Finding 8                     | Código confirmado. Pode ser política de backoffice (`materials:read` = tudo na org). PII no CSV torna a ambiguidade perigosa. |

---

## P3 — hardening

| ID      | Finding                                                   | Estado                                                   | Sev.  | Modelos     |
| ------- | --------------------------------------------------------- | -------------------------------------------------------- | ----- | ----------- |
| CONS-29 | `@UserId` / alguns guards fazem `jwt.decode` sem `verify` | Refutado _como exploração atual_; Confirmado como dívida | Baixa | Opus CMO-10 |

`AuthGuard` global faz `jwtService.verify` **antes**. Decode sem verify **não** autentica hoje.

---

## Refutados / não promover a finding aberto

| Afirmação                                                                      | Classificação                      | Porquê                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------ | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`minha-chave-nova.pem` ainda versionada (CONS-01 da consolidação anterior)** | **Refutado**                       | `HEAD` é `9f5fb15` (`chore: remove chave privada obsoleta`). O ficheiro **não** está no tree nem em `git ls-files`. Era chave SSH obsoleta de instância AWS fora de serviço. O blob antigo permanece só no histórico até `9f5fb15^` — isso **não** reabre P0. |
| Dummy bcrypt → **500 vs 401** (Grok CM-06 tal como escrito)                    | Refutado                           | Email inexistente nunca chega a `compare`; dá **404**.                                                                                                                                                                                                        |
| JWT `decode` sem verify é bypass (CMO-10 explotável)                           | Refutado                           | `AuthGuard` verifica a assinatura primeiro.                                                                                                                                                                                                                   |
| Multipart ilimitado “só com `materials:create`”                                | Refutado                           | Parser corre antes do 401.                                                                                                                                                                                                                                    |
| Portal cross-org “ok porque o SPA manda a org certa”                           | Refutado                           | Controlo tem de ser no servidor.                                                                                                                                                                                                                              |
| Blacklist in-memory “ok com uma réplica”                                       | Refutado                           | Worker + restart + fail-open.                                                                                                                                                                                                                                 |
| Redis exposto no compose **prod**                                              | Não confirmado / abaixo do corte   | Prod não publica a porta; Grok CM-11 é o ficheiro **dev**.                                                                                                                                                                                                    |
| CSRF cookie / SQLi / path traversal de upload / SSRF via key                   | Refutados nos relatórios originais | Prisma; keys com prefixo de org + id; sem fetch de URL arbitrária.                                                                                                                                                                                            |
| IDOR de print export, notificações HTTP, CRUD de assets                        | Controlos presentes (Sol/Grok)     | Não promover.                                                                                                                                                                                                                                                 |

---

## Deduplicação (origem → ID)

| Relato                                  | Consolida em                  |
| --------------------------------------- | ----------------------------- |
| Grok CM-01, Opus CMO-01, Sol F1         | CONS-02                       |
| Grok CM-02, Opus CMO-04, Sol F5         | CONS-05                       |
| Grok CM-03+CM-04, Opus CMO-02, Sol F3   | CONS-03                       |
| Grok CM-05, Opus CMO-06, Sol F6 (cache) | CONS-09                       |
| Grok CM-06                              | CONS-16 (mecanismo corrigido) |
| Grok CM-07                              | CONS-11                       |
| Grok CM-08, Sol F7                      | CONS-04                       |
| Grok CM-09                              | CONS-18                       |
| Grok CM-10                              | CONS-19                       |
| Grok CM-11                              | CONS-20                       |
| Grok CM-12, Opus CMO-08                 | CONS-15                       |
| Opus CMO-03                             | CONS-06                       |
| Opus CMO-05, Sol F2                     | CONS-08                       |
| Opus CMO-07, Sol F6 (`isActive`)        | CONS-10                       |
| Opus CMO-09                             | CONS-27                       |
| Opus CMO-10                             | CONS-29                       |
| Sol F4                                  | CONS-07                       |
| Sol F8                                  | CONS-28                       |
| Grok IR-01…IR-10                        | CONS-12–14, 17, 21–26         |
| PEM no tree                             | **não é finding aberto**      |

---

## Ordem de trabalho (não é votação)

1. **CONS-02** — autenticar/autorizar `GET /file` ou abolir o signer genérico.
2. **CONS-03** — scoping de user a membership; tirar `password` / `globalRoleId` do DTO org-scoped.
3. **CONS-04** — limites no parser (e no proxy) **antes** de bufferizar; remover `unlimitedUpload`.
4. **CONS-07** depois **CONS-06** — RBAC global só para ADMIN de plataforma; `organizationIds` só nas orgs do caller.
5. **CONS-05** + **CONS-08** — membership guard + CRA na listagem por slug.
6. **CONS-09** + **CONS-10** — denylist partilhada fail-closed; honrar `isActive`.
7. Fiabilidade P1: **CONS-12, CONS-13, CONS-14**.

Dois modelos terem visto o mesmo item **não** foi usado como prova; os P0 acima aguentam reabertura independente no código.
