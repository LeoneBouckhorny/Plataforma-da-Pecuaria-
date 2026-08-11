# QA Sprint 001

## Ambiente

- Sistema: Windows, PowerShell.
- Repositorio: `C:\Users\leobo\OneDrive\Documentos\plataforma da pecuaria`.
- Branch: `feature/sprint-001-local-first`.
- Navegador principal do QA: Codex In-app Browser via `http://127.0.0.1:8028/index.html`.
- Falha de IndexedDB: Microsoft Edge headless via Playwright, com `indexedDB` removido por init script antes do carregamento da aplicacao.
- Servidor local: servidor HTTP temporario em `127.0.0.1:8028`.

## Comandos Executados

```powershell
node --check app.js
node --check src/calculator-core.js
node --check src/local-data-core.js
node --check src/local-database.js
node --check src/draft-repository.js
node --test tests/calculator-core.test.js tests/local-data-core.test.js
```

Resultado automatizado:

```text
tests 31
pass 31
fail 0
```

## Testes Node

| Grupo | Resultado |
| --- | --- |
| 14 testes herdados da Sprint 000 | Aprovado |
| Criacao de draft valido | Aprovado |
| Preservacao de IDs | Aprovado |
| Normalizacao | Aprovado |
| Campos ausentes recebem defaults oficiais | Aprovado |
| Parametros explicitamente vazios permanecem vazios | Aprovado |
| Data explicitamente vazia permanece vazia | Aprovado |
| Schema version | Aprovado |
| Schema incompatível | Aprovado |
| Campos vazios | Aprovado |
| Animais sem brinco | Aprovado |
| Valores com virgula | Aprovado |
| Dados invalidos preservados | Aprovado |
| Dados invalidos permanecem intactos durante normalizacao | Aprovado |
| Serializacao sem DOM | Aprovado |
| Demo nao elegivel para persistencia | Aprovado |
| Reset do draft | Aprovado |

## Teste A - Persistencia

Entrada:

- Nome: `Pesagem Teste Persistência`
- Propriedade: `Fazenda Teste`
- Animal A: 450 kg
- Animal B: 510 kg

Evidencia apos salvamento:

```json
{
  "saveStatus": "Salvo neste dispositivo",
  "weighingName": "Pesagem Teste Persistência",
  "propertyName": "Fazenda Teste",
  "totalAnimals": "2",
  "totalWeight": "960 kg",
  "averageWeight": "480 kg",
  "animalRows": [
    { "tag": "A", "weight": "450", "category": "Boi" },
    { "tag": "B", "weight": "510", "category": "Boi" }
  ]
}
```

Evidencia apos reload:

```json
{
  "saveStatus": "Salvo neste dispositivo",
  "weighingName": "Pesagem Teste Persistência",
  "propertyName": "Fazenda Teste",
  "totalAnimals": "2",
  "totalWeight": "960 kg",
  "averageWeight": "480 kg",
  "animalRows": [
    { "tag": "A", "weight": "450", "category": "Boi" },
    { "tag": "B", "weight": "510", "category": "Boi" }
  ]
}
```

Resultado: aprovado.

## Teste B - Edicao

Acao:

- Alterar Animal A de 450 kg para 470 kg.
- Aguardar `Salvo neste dispositivo`.
- Recarregar.

Evidencia apos reload:

```json
{
  "totalAnimals": "2",
  "totalWeight": "980 kg",
  "averageWeight": "490 kg",
  "animalRows": [
    { "tag": "A", "weight": "470", "category": "Boi" },
    { "tag": "B", "weight": "510", "category": "Boi" }
  ]
}
```

Resultado: aprovado.

## Teste C - Limpeza

Acao:

- Clicar `Limpar pesagem`.
- Aguardar `Salvo neste dispositivo`.
- Recarregar.

Evidencia apos reload:

```json
{
  "weighingName": "",
  "propertyName": "",
  "totalAnimals": "0",
  "totalWeight": "0 kg",
  "averageWeight": "0 kg",
  "animalRows": [],
  "demoVisible": false
}
```

Resultado: aprovado.

## Teste D - Demonstracao

Fluxo:

1. Criar draft real com `REAL-001`, 455 kg.
2. Aguardar `Salvo neste dispositivo`.
3. Carregar dados de exemplo.
4. Alterar `EX-001` para 999 kg.
5. Recarregar.

Evidencia antes da demonstracao:

```json
{
  "weighingName": "Draft Real Demo",
  "propertyName": "Fazenda Real",
  "animalRows": [
    { "tag": "REAL-001", "weight": "455", "category": "Boi" }
  ],
  "totalWeight": "455 kg",
  "demoVisible": false
}
```

Evidencia durante demonstracao:

```json
{
  "weighingName": "Demonstração",
  "animalRows": [
    { "tag": "EX-001", "weight": "999", "category": "Boi" },
    { "tag": "EX-002", "weight": "510", "category": "Boi" }
  ],
  "demoVisible": true
}
```

Evidencia apos reload:

```json
{
  "weighingName": "Draft Real Demo",
  "propertyName": "Fazenda Real",
  "animalRows": [
    { "tag": "REAL-001", "weight": "455", "category": "Boi" }
  ],
  "totalWeight": "455 kg",
  "demoVisible": false
}
```

Resultado: aprovado. A demonstracao nao substituiu o draft real.

## Teste E - Falha de IndexedDB

Simulacao:

- `indexedDB` removido antes do carregamento da pagina em Edge headless.

Evidencia:

```json
{
  "indexedDBType": "undefined",
  "saveStatus": "Não foi possível salvar neste dispositivo",
  "persistenceMessage": "A pesagem continua funcionando, mas não foi possível preservar os dados neste dispositivo.",
  "totalAnimals": "1",
  "totalWeight": "450 kg",
  "averageWeight": "450 kg",
  "pageErrors": []
}
```

Resultado: aprovado. A calculadora continuou operacional e nao alegou salvamento.

## Teste F - Fidelidade do Draft Invalido

Fluxo:

1. Abrir aplicacao.
2. Apagar completamente o preco por arroba.
3. Apagar completamente o rendimento.
4. Aguardar `Salvo neste dispositivo`.
5. Recarregar.

Evidencia apos reload:

```json
{
  "arrobaPrice": "",
  "yieldRate": "",
  "lightLimit": "300",
  "mediumLimit": "420",
  "priceMessage": "Informe o preço por arroba.",
  "yieldMessage": "Informe o rendimento.",
  "totalArrobas": "Indisponível",
  "estimatedValue": "Indisponível",
  "saveStatus": "Salvo neste dispositivo"
}
```

Resultado: aprovado. Os campos explicitamente vazios permaneceram vazios e nenhum default foi introduzido silenciosamente.

## Teste G - Data Vazia

Fluxo:

1. Limpar pesagem.
2. Recarregar sem draft.
3. Confirmar defaults oficiais e data local atual.
4. Apagar a data.
5. Aguardar `Salvo neste dispositivo`.
6. Recarregar.
7. Confirmar que a data continua vazia.
8. Limpar novamente e confirmar que um estado novo volta a usar a data local atual.

Evidencia sem draft:

```json
{
  "weighingDate": "2026-08-10",
  "arrobaPrice": "300,00",
  "yieldRate": "50",
  "lightLimit": "300",
  "mediumLimit": "420"
}
```

Evidencia apos apagar data e recarregar:

```json
{
  "weighingDate": "",
  "arrobaPrice": "300,00",
  "yieldRate": "50",
  "lightLimit": "300",
  "mediumLimit": "420",
  "saveStatus": "Salvo neste dispositivo"
}
```

Evidencia apos limpeza final:

```json
{
  "weighingDate": "2026-08-10",
  "arrobaPrice": "300,00",
  "yieldRate": "50",
  "lightLimit": "300",
  "mediumLimit": "420"
}
```

Resultado: aprovado. A data explicitamente vazia foi preservada, e um estado novo sem draft continuou usando a data local atual.

## Responsividade

### 360 px

```json
{
  "viewport": 360,
  "documentScrollWidth": 345,
  "bodyScrollWidth": 345,
  "tableClientWidth": 289,
  "tableScrollWidth": 700,
  "saveStatus": "Salvo neste dispositivo"
}
```

Resultado: aprovado. `document.documentElement.scrollWidth <= window.innerWidth`.

### 1280 px

```json
{
  "viewport": 1280,
  "documentScrollWidth": 1265,
  "bodyScrollWidth": 1265,
  "tableClientWidth": 769,
  "tableScrollWidth": 769,
  "saveStatus": "Salvo neste dispositivo"
}
```

Resultado: aprovado.

## Checagens Estaticas

| Checagem | Resultado |
| --- | --- |
| Ausencia de `innerHTML` em `app.js` e `src/*.js` | Aprovado |
| Ausencia de `localStorage` e `sessionStorage` em `app.js` e `src/*.js` | Aprovado |
| Ausencia de `serviceWorker` | Aprovado |
| Ausencia de `fetch`, `XMLHttpRequest`, `WebSocket` e `openDatabase` | Aprovado |
| Ausencia de `toISOString().slice` e `toISOString().substring` | Aprovado |

Observacao: `toISOString()` e usado somente para `updatedAt` do draft, nao para preencher a data local da pesagem.

## Limitacoes

- Nao ha PWA.
- Nao ha service worker.
- Nao ha cache offline completo da aplicacao.
- Nao ha login, autenticacao ou conta real.
- Nao ha sincronizacao.
- Nao ha historico completo de pesagens.
- Nao ha banco remoto.
- O draft local e apenas a pesagem em andamento no dispositivo.
