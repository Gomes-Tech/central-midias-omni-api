# Integração do front-end com o módulo de Assets do Editor

## Propósito

O módulo `assets` mantém uma biblioteca de imagens por organização para uso no editor de templates baseado em Konva.

Administradores podem enviar, listar, renomear, substituir e excluir imagens. Os assets serão posteriormente selecionados no editor e inseridos como nós de imagem nos templates de materiais.

Esta entrega trata apenas da biblioteca de assets. Ainda não existe na API uma entidade de template nem uma relação entre assets e templates.

## Comportamento geral

- Cada asset pertence a uma única organização.
- A organização é determinada pelo header `X-Organization-ID`.
- Uma organização nunca consegue consultar ou alterar assets de outra organização.
- Os arquivos são armazenados em um bucket S3 público.
- A API retorna URLs públicas permanentes; não é necessário solicitar URL assinada.
- A chave interna do S3 (`fileKey`) não é exposta ao front-end.
- São aceitos PNG, JPG/JPEG e SVG.
- SVGs são sanitizados no backend antes de serem armazenados.
- A exclusão é definitiva no banco e no S3.

Base das rotas:

```text
/api/assets
```

## Autenticação e permissões

As requisições seguem a autenticação já utilizada pelo admin e devem enviar:

```http
Authorization: Bearer <access-token>
X-Api-Key: <api-key>
X-Organization-ID: <organization-id>
```

O módulo possui as seguintes permissões RBAC:

| Operação | Permissão |
|---|---|
| Listar e consultar | `assets:read` |
| Enviar arquivos | `assets:create` |
| Renomear ou substituir | `assets:update` |
| Excluir | `assets:delete` |

## Tipos esperados no front-end

```ts
export interface Asset {
  id: string;
  name: string;
  url: string;
  mimeType: 'image/png' | 'image/jpeg' | 'image/svg+xml';
  size: number; // bytes
  createdAt: string; // ISO-8601
  updatedAt: string; // ISO-8601
}

export interface PaginatedAssets {
  data: Asset[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ApiError {
  statusCode: number;
  timestamp: string;
  path: string;
  message: string;
}
```

## Endpoints

### 1. Listar assets

```http
GET /api/assets?page=1&limit=25&searchTerm=logo
```

Query params:

| Campo | Tipo | Obrigatório | Regra |
|---|---|---|---|
| `page` | number | Não | Padrão `1`, mínimo `1`. |
| `limit` | number | Não | Padrão `25`, mínimo `1`, máximo `100`. |
| `searchTerm` | string | Não | Busca parcial e case-insensitive pelo nome. |

Ordenação da API: nome crescente e, em caso de empate, data de criação decrescente.

Resposta `200 OK`:

```json
{
  "data": [
    {
      "id": "9c7bd407-e93b-4261-a82d-1cc51a6c74dc",
      "name": "Logo principal",
      "url": "https://assets-editor.s3.us-east-1.amazonaws.com/organizations/org-id/assets/asset-id/object-id.png",
      "mimeType": "image/png",
      "size": 28431,
      "createdAt": "2026-07-27T18:00:00.000Z",
      "updatedAt": "2026-07-27T18:00:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "totalPages": 1
}
```

### 2. Consultar um asset

```http
GET /api/assets/:id
```

Resposta `200 OK`: um objeto `Asset`.

Retorna `404` quando o asset não existe ou pertence a outra organização.

### 3. Enviar assets em lote

```http
POST /api/assets
Content-Type: multipart/form-data
```

Enviar cada arquivo repetindo o campo `files`:

```ts
const formData = new FormData();

for (const file of selectedFiles) {
  formData.append('files', file);
}

const response = await api.post<Asset[]>('/assets', formData);
```

Regras:

- Mínimo de 1 e máximo de 20 arquivos por requisição.
- Máximo de 5 MB por arquivo.
- Extensões permitidas: `.png`, `.jpg`, `.jpeg` e `.svg`.
- MIME types aceitos: `image/png`, `image/jpeg`, `image/jpg` e `image/svg+xml`.
- Não enviar outros campos de arquivo além de `files`.
- O nome inicial é derivado do nome original sem a extensão.
- Nomes duplicados são permitidos.

Resposta `201 Created`: array de `Asset`, preservando a ordem dos arquivos enviados.

```json
[
  {
    "id": "asset-1",
    "name": "Logo principal",
    "url": "https://assets-editor.s3.us-east-1.amazonaws.com/organizations/org-id/assets/asset-1/object-id.png",
    "mimeType": "image/png",
    "size": 28431,
    "createdAt": "2026-07-27T18:00:00.000Z",
    "updatedAt": "2026-07-27T18:00:00.000Z"
  }
]
```

O lote é atômico do ponto de vista da API: se qualquer arquivo for inválido ou algum upload/persistência falhar, nenhum asset do lote será criado. A API tenta remover do S3 os arquivos que já tenham sido enviados.

### 4. Renomear um asset

Para alterar somente o nome, enviar JSON:

```http
PATCH /api/assets/:id
Content-Type: application/json
```

```json
{
  "name": "Novo nome"
}
```

O nome deve ter entre 1 e 150 caracteres.

Resposta `200 OK`: o `Asset` atualizado.

### 5. Substituir o arquivo de um asset

Para trocar a imagem, enviar `multipart/form-data` com um único arquivo no campo singular `file`:

```ts
const formData = new FormData();
formData.append('file', newFile);

const response = await api.patch<Asset>(`/assets/${assetId}`, formData);
```

Também é possível renomear e substituir na mesma requisição:

```ts
const formData = new FormData();
formData.append('name', 'Nova identidade visual');
formData.append('file', newFile);

const response = await api.patch<Asset>(`/assets/${assetId}`, formData);
```

Regras:

- Aceita no máximo um arquivo no campo `file`.
- Exige pelo menos `name` ou `file`.
- Se apenas `file` for enviado, o nome atual é preservado.
- O arquivo anterior é removido do S3 após a atualização.
- A URL pública muda quando o arquivo é substituído.

Resposta `200 OK`: o `Asset` atualizado.

### 6. Excluir um asset

```http
DELETE /api/assets/:id
```

Resposta:

```http
204 No Content
```

A operação remove primeiro o objeto do S3 e depois exclui definitivamente o registro no banco.

Nesta primeira versão ainda não existem templates relacionados ao asset. Quando templates forem implementados, a API deverá impedir a exclusão de assets em uso. Até lá, o front deve exibir uma confirmação clara antes da exclusão.

## Validação e sanitização de arquivos

O backend não confia apenas na extensão informada pelo navegador:

- PNG deve possuir assinatura e finalização binária válidas.
- JPEG deve possuir os marcadores binários esperados.
- Extensão e MIME devem ser compatíveis.
- Arquivos vazios ou corrompidos retornam `400`.

Para SVG, o backend:

- remove scripts e atributos de evento, como `onclick` e `onload`;
- remove `foreignObject`, iframes, objetos incorporados e estilos perigosos;
- remove URLs externas e data URLs;
- preserva formas, paths, grupos, textos, gradientes, máscaras e referências locais `#id` seguras;
- aceita SVG com declaração XML no início;
- armazena e calcula o tamanho da versão sanitizada.

Depois de um upload SVG, o front deve usar a `url` retornada pela API como fonte definitiva da imagem. A versão armazenada pode ser diferente do arquivo local devido à sanitização.

## Uso com Konva

As URLs retornadas são públicas e podem ser usadas diretamente como `src` dos nós de imagem.

Exemplo conceitual:

```ts
const image = new window.Image();
image.crossOrigin = 'anonymous';
image.src = asset.url;

image.onload = () => {
  const node = new Konva.Image({
    image,
    x: 0,
    y: 0,
  });
};
```

O bucket precisa estar configurado pela infraestrutura com CORS para `GET` e `HEAD` a partir da origem do front-end. Se o canvas ficar contaminado (`tainted canvas`) durante exportações do Konva, verificar primeiro a política CORS do bucket e se `crossOrigin = 'anonymous'` foi definido antes de atribuir `src`.

## Códigos de erro relevantes

| Status | Significado esperado |
|---|---|
| `400` | Arquivo inválido, lote vazio/maior que 20, formato incorreto, PATCH sem alteração ou nome inválido. |
| `401` | Token ausente, inválido ou expirado. |
| `403` | Usuário sem a permissão RBAC necessária. |
| `404` | Asset inexistente ou pertencente a outra organização. |
| `500` | Falha inesperada de storage ou infraestrutura. |

Formato geral:

```json
{
  "statusCode": 400,
  "timestamp": "2026-07-27T18:00:00.000Z",
  "path": "/api/assets",
  "message": "Mensagem descritiva do erro"
}
```

## Sugestão de implementação no admin

1. Criar um client/service `assets` com os cinco métodos HTTP descritos acima.
2. Criar uma tela paginada com busca por nome e upload múltiplo.
3. Mostrar thumbnail usando `asset.url`, nome, tipo e tamanho formatado.
4. Permitir rename sem exigir novo upload.
5. Atualizar imediatamente o asset local com a resposta do PATCH, pois a URL pode mudar.
6. Exibir os erros individuais retornados pela API e manter o lote selecionado quando o POST falhar.
7. Solicitar confirmação antes do DELETE.
8. Reutilizar essa biblioteca no futuro editor de templates, mantendo inicialmente o `asset.id` como identificador lógico e a `url` como fonte de renderização.

## Fora do escopo desta entrega

- CRUD de templates.
- Relação entre material e template.
- Relação entre template e asset.
- Publicação/rascunho de templates.
- Campos editáveis ou bloqueados do Konva.
- Proteção contra exclusão de assets já usados por templates.
