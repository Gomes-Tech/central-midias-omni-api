# Marcadores de imagem: contrato de integração

## Objetivo e disponibilidade

O admin define áreas de imagem no template. O agente escolhe uma foto para cada área visível. As exportações PNG/JPG/PDF feitas no navegador continuam locais. Para PDF de impressão profissional, a API recebe as fotos temporariamente no pedido de exportação e gera o PDF/X pelo worker existente.

O desenho padrão do marcador pertence ao front. Nenhuma imagem padrão precisa ser enviada à API ou cadastrada na biblioteca. As fotos do agente não alteram o template e não se tornam assets.

**Ordem de disponibilização:** aplicar a migração `20260913120000_add_print_export_inputs`, atualizar API e worker, integrar o front e somente então publicar templates com marcadores. O adaptador antigo do front reconhece apenas texto e assets e pode omitir os marcadores ao salvar. A API mantém válidos os documentos antigos; a nova camada existe apenas em documentos V2.

## Documento salvo pelo admin

As rotas existentes continuam disponíveis, sob `/api`:

- `GET /materials/:id/template`: consulta administrativa; permissão `materials:read`.
- `PUT /materials/:id/template`: salva o documento completo; permissão `materials:update`.
- `POST /materials/:id/template/publish`: publica a revisão salva; permissão `materials:update`.
- `GET /materials/:id/customization-template`: consulta do agente, sujeita ao acesso à categoria e à publicação do template.

Exemplo de corpo de `PUT /materials/:id/template`:

```json
{
  "revision": 0,
  "document": {
    "version": 2,
    "canvas": { "width": 1080, "height": 1080 },
    "layerOrder": ["agent-photo"],
    "layers": [
      {
        "id": "agent-photo",
        "type": "image-placeholder",
        "name": "Foto do agente",
        "x": 80,
        "y": 120,
        "width": 360,
        "height": 480,
        "rotation": 0,
        "isVisible": true,
        "editableProperties": ["image"]
      }
    ]
  }
}
```

Regras da camada:

- Somente os campos apresentados são aceitos. Não incluir `assetId`, `url`, `src`, base64, arquivo, `profileBinding`, crop ou outros atributos.
- `id` deve ser único no documento, não vazio e ter até 100 caracteres; `name`, até 150 caracteres. `layerOrder` deve conter todos os IDs uma única vez.
- `x`, `y` e `rotation` são números finitos. `width` e `height` são finitos e maiores que zero. As coordenadas usam as unidades do canvas; `rotation` usa graus.
- `x` e `y` representam o canto superior esquerdo do retângulo sem rotação. A rotação da imagem ocorre ao redor do centro do retângulo, como nas camadas de asset.
- `editableProperties` é exatamente `["image"]`. O agente substitui a foto; posição, tamanho, rotação, visibilidade e ordem pertencem ao admin.
- Até 20 marcadores, incluindo ocultos, dentro do limite existente de 200 camadas. O canvas mantém seus limites de 6000 px por lado e 30 megapixels.
- Um template pode ser publicado com apenas um marcador visível, sem texto editável. Marcadores ocultos não satisfazem sozinhos essa condição.

Salvar retorna o template em `DRAFT` e incrementa `revision`. Publicar usa a revisão retornada pelo salvamento:

```json
{ "revision": 1 }
```

Publicar incrementa novamente a revisão. Uma revisão desatualizada retorna `409`. O agente só acessa o documento publicado. As respostas devolvem a camada integralmente em `document.layers`; o marcador não aparece em `assets` ou `missingAssetIds`.

## Comportamento do front

Renderizar um marcador padrão quando ainda não houver foto. Manter as fotos escolhidas e o enquadramento em estado local, associados pelo `layerId`, fora de `document.layers`.

Cada marcador visível precisa receber uma foto antes de exportar. Marcadores ocultos não recebem arquivos e não são desenhados. O front deve aplicar a mesma regra nos downloads locais; a API a aplica no PDF de impressão.

O padrão é **cover centralizado**, sem deformar a foto. O agente também pode selecionar `contain`, reposicionar a imagem nos eixos horizontal e vertical e aplicar zoom entre `1` e `3`. As posições são normalizadas de `0` a `1`, com centro em `0.5`. Em `contain`, as sobras são transparentes e revelam a arte-base. Aplicar o recorte no sistema de coordenadas da camada antes de sua rotação. Para JPEG, respeitar a orientação EXIF, como faz o renderizador da API. A ordem visual segue `layerOrder`.

O front não deve adicionar campos de imagem ao documento serializado nem substituir `image-placeholder` por `asset`. As camadas de asset existentes permanecem fixas para o agente.

## Pedido de impressão com fotos

Enviar `POST /api/materials/:id/print-exports` com autenticação e organização iguais às demais rotas. A impressão requer `PRINT_EXPORT_ENABLED=true`, worker disponível e template publicado com preset de impressão válido.

Usar `multipart/form-data` com três campos de texto:

- `document`: JSON serializado do documento V2, com as alterações de texto permitidas e os marcadores preservados.
- `idempotencyKey`: string não vazia de até 120 caracteres.
- `imageBindings`: JSON serializado de uma lista de `{ "layerId": "...", "fileField": "...", "fit": "cover|contain", "positionX": 0.5, "positionY": 0.5, "zoom": 1 }`.

Os quatro campos de enquadramento são opcionais para retrocompatibilidade. Quando ausentes, a API usa `cover`, `0.5`, `0.5` e `1`.

Cada `fileField` identifica uma parte de arquivo no mesmo multipart. Usar nomes únicos de até 100 caracteres, contendo somente letras ASCII, números, `_` ou `-`. Cada marcador visível deve ter exatamente uma associação e um arquivo. Não enviar arquivos extras, repetir campos ou associar arquivos a assets, textos, marcadores ocultos ou camadas inexistentes.

Exemplo no navegador:

```ts
const body = new FormData();
body.set('document', JSON.stringify(customizedDocument));
body.set('idempotencyKey', exportAttemptKey);
body.set(
  'imageBindings',
  JSON.stringify([
    {
      layerId: 'agent-photo',
      fileField: 'photo_0',
      fit: 'cover',
      positionX: 0.5,
      positionY: 0.25,
      zoom: 1.4,
    },
  ]),
);
body.set('photo_0', selectedFile, selectedFile.name);

const response = await fetch(
  `${apiUrl}/materials/${materialId}/print-exports`,
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'X-Api-Key': apiKey,
      'X-Organization-ID': organizationId,
    },
    body,
  },
);
```

Deixar o navegador definir `Content-Type` e o boundary do multipart. Para documentos sem marcadores visíveis, o contrato JSON anterior permanece aceito:

```json
{
  "document": {
    "version": 2,
    "canvas": { "width": 1080, "height": 1080 },
    "layerOrder": [],
    "layers": []
  },
  "idempotencyKey": "unique-export-attempt"
}
```

Esse exemplo representa o formato da requisição; o documento enviado deve corresponder ao template publicado, alterando apenas os textos autorizados.

### Limites e resolução

- PNG e JPEG, com MIME correspondente (`image/png`, `image/jpeg`; `image/jpg` também é normalizado).
- Até 5 MiB por arquivo, 20 arquivos, 6000 pixels por lado e 30 megapixels por foto.
- Cada campo textual do multipart aceita até 3 MiB; somente os três campos acima são necessários.
- A API verifica arquivos e associações antes de armazenar ou enfileirar.
- O preflight administrativo valida a estrutura do template e não exige fotos do agente. Cada exportação valida também a resolução das fotos conforme `minimumDpi` do preset.

Para cover, o DPI-base é o menor entre `larguraPixels / larguraDoMarcadorEmPolegadas` e `alturaPixels / alturaDoMarcadorEmPolegadas`. Para contain, é o maior. O DPI efetivo é o DPI-base dividido pelo zoom. A dimensão física do marcador deriva de sua proporção no canvas e da área total de sangria do preset. As dimensões da foto consideram a orientação EXIF.

### Resposta, acompanhamento e idempotência

A criação mantém a resposta existente: `id`, `materialId`, `status`, `progress`, `errorCode`, `errorMessage`, `size`, `expiresAt`, `createdAt` e `updatedAt`. Uma criação aceita retorna `201`, normalmente em `QUEUED`.

- Consultar `GET /api/print-exports/:id` até `COMPLETED` ou `FAILED`.
- Obter a URL assinada em `GET /api/print-exports/:id/download` após `COMPLETED`.
- O PDF continua disponível por 24 horas após sua geração. Exportações e downloads mantêm isolamento por organização e usuário.
- A idempotência inclui o documento, os checksums e o enquadramento de cada arquivo associado. A ordem de envio dos bindings não altera o hash.
- Repetir a mesma chave exige o mesmo documento e os mesmos bytes de cada foto. Outra foto, mesmo visualmente parecida, pode produzir `409`.
- Após falha, reenviar o multipart completo com a mesma chave e os mesmos arquivos permite recuperar a exportação. Após expiração, iniciar outra exportação com uma nova chave.
- A API não devolve URLs das fotos temporárias. Os downloads locais do navegador não precisam chamar este endpoint.

### Erros

Os erros usam o envelope atual da API, com `statusCode`, `message`, `path` e `timestamp`.

- `400`: documento alterado além das permissões, JSON inválido, associação inválida/duplicada, imagem ausente ou inválida, DPI insuficiente, preset/preflight indisponível.
- `413`: arquivo acima de 5 MiB ou multipart acima do limite total.
- `403`: usuário sem acesso ao material ou sem permissão administrativa para salvar/publicar.
- `404`: template publicado indisponível, material de outra organização ou exportação não pertencente ao usuário.
- `409`: revisão administrativa desatualizada ou chave de idempotência usada com conteúdo diferente.

Erros de associação, foto e DPI incluem o ID da camada no `message`, por exemplo `Marcador agent-photo: imagem obrigatória`. A ausência de várias fotos lista os IDs. Erros detectados pelo parser multipart podem ocorrer antes da leitura dos bindings e usam mensagem geral de upload. Durante falhas de processamento, o status usa `PRINT_RENDER_FAILED`; tentativas automáticas preservam os arquivos até o término.

## Persistência temporária e operação

Os arquivos ficam no armazenamento privado existente, sob `print-export-inputs/<organizationId>/<exportId>/<id>.<ext>`, com chave nova por tentativa. Não criar outro bucket nem publicar esse prefixo.

`print_export_inputs` guarda somente o rastreio: exportação, organização, usuário, camada, chave, checksum, MIME, tamanho, dimensões, enquadramento e datas. O registro é criado antes do upload e não possui FKs com cascata; assim, a coleta continua possível se a exportação, usuário, organização ou template for excluído.

Após sucesso ou falha definitiva, o worker tenta excluir as fotos e seus registros. Uma exclusão malsucedida mantém o registro para nova tentativa. Arquivos de uploads interrompidos ou tentativas abandonadas expiram em 24 horas; o job horário existente coleta os expirados em lotes. A remoção física depende do worker e do storage disponíveis e pode ocorrer no ciclo seguinte à expiração. Imagens expiradas não podem ser usadas em uma nova renderização.

Os jobs guardam IDs dos registros temporários, nunca buffers ou base64. O worker confere propriedade, expiração e checksum antes de renderizar. A migração é aditiva e não altera templates, assets ou exportações existentes.

## Verificação focada

Os testes da feature cobrem validação e publicação de marcadores, leitura pelo agente, restrições de edição, multipart real, arquivos e EXIF, DPI, idempotência, upload parcial, retries, coleta e PDF/X real com conferência dos pixels de cover, rotação e sobreposição.

Para a conferência visual opcional do PDF de teste:

```sh
PRINT_IMAGE_QA_DIR=/tmp/omni-image-placeholder-qa \
  node_modules/.bin/jest --runInBand --runTestsByPath \
  src/modules/print/services/print-image-render.integration.spec.ts
```

O teste requer Ghostscript, qpdf e Poppler. A pasta indicada recebe `placeholders.pdf` e `placeholders.png`. Não há necessidade de executar a suíte completa da branch para validar esta feature.
