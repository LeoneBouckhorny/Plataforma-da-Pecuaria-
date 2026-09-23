# QA Sprint 002

## Ambiente

- Sistema: Windows, PowerShell.
- Repositorio: `C:\Users\leobo\OneDrive\Documentos\plataforma da pecuaria`.
- Branch: `feature/sprint-002-weighing-history`.
- Data do QA: 2026-08-12.
- Servidor local: `http://127.0.0.1:8026/index.html`.
- Navegador: Codex In-app Browser com viewport override para 360x800 e 1280x900.

## Comandos Executados

```powershell
node --check app.js
node --check src/local-database.js
node --check src/weighing-history-core.js
node --check src/weighing-repository.js
node --check src/csv-export-core.js
node --check tests/local-database-migration.test.js
node --check tests/draft-repository.test.js
node --test tests/calculator-core.test.js tests/local-data-core.test.js tests/draft-repository.test.js tests/local-database-migration.test.js tests/weighing-history-core.test.js tests/csv-export-core.test.js tests/weighing-repository.test.js
node --test tests/*.test.js
```

Resultado automatizado:

```text
tests 58
pass 58
fail 0
```

## Testes Automatizados

| Grupo | Resultado |
| --- | --- |
| Regressao da calculadora | Aprovado |
| Draft local da Sprint 001 | Aprovado |
| Regressao de demo preservando draft real | Aprovado |
| Migracao IndexedDB V1 para V2 | Aprovado |
| Snapshot historico de pesagem | Aprovado |
| Repositorio de sessoes e itens | Aprovado |
| Exportacao CSV | Aprovado |

## Cenario de Referencia

Entrada:

- Animal 1: 450 kg;
- Animal 2: 510 kg;
- preco: R$ 300,00 por arroba;
- rendimento: 50%.

Resultado esperado:

- quantidade: 2 animais;
- peso total: 960 kg;
- peso medio: 480 kg;
- arrobas estimadas: 32;
- valor estimado: R$ 9.600,00.

Resultado obtido no navegador:

```json
{
  "animals": "2",
  "totalWeight": "960 kg",
  "averageWeight": "480 kg",
  "arrobas": "32 @",
  "value": "R$ 9.600,00",
  "reportRows": 2
}
```

Resultado: aprovado.

## Fluxos de Historico

| Cenario | Resultado Obtido | Status |
| --- | --- | --- |
| Finalizar pesagem valida | Mensagem `Pesagem salva neste dispositivo.` exibida; historico com 1 sessao | Aprovado |
| Duplo clique em finalizar | Apenas 1 sessao criada; botao fica desabilitado para o mesmo rascunho | Aprovado |
| Ver pesagem salva | Aba Historico abre detalhe read-only com dados salvos | Aprovado |
| Editar rascunho depois de salvar | Rascunho mudou para 1.509 kg; historico permaneceu em 960 kg | Aprovado |
| Nova pesagem | Linhas do rascunho zeradas; sessao anterior permaneceu no historico | Aprovado |
| Excluir pesagem | Dialog exibe `Excluir esta pesagem deste dispositivo?` e `Esta acao nao pode ser desfeita.`; historico volta ao estado vazio | Aprovado |

## Correcao Final Obrigatoria

QA de navegador executado em `http://127.0.0.1:8027/index.html`.

Resultado geral da rodada:

```text
cenarios 12
pass 12
fail 0
```

### A - Draft real -> demo -> reload

Fluxo:

1. Criar draft real.
2. Aguardar `Salvo neste dispositivo`.
3. Carregar demonstracao.
4. Alterar `EX-001` para 999 kg.
5. Recarregar a aplicacao.

Evidencia antes da demonstracao:

```json
{
  "name": "Draft Real",
  "propertyName": "Fazenda Real",
  "tags": ["REAL-001"],
  "weights": ["455"],
  "saveStatus": "Salvo neste dispositivo"
}
```

Evidencia durante a demonstracao:

```json
{
  "name": "Demonstracao",
  "tags": ["EX-001", "EX-002"],
  "weights": ["999", "510"],
  "finalizeEnabled": false,
  "saveStatus": "Demonstracao nao salva"
}
```

Evidencia apos reload:

```json
{
  "name": "Draft Real",
  "propertyName": "Fazenda Real",
  "tags": ["REAL-001"],
  "weights": ["455"],
  "rows": 1
}
```

Resultado: aprovado. `EX-001` e `EX-002` nao reapareceram apos reload.

### B - Finalizar -> reload

Fluxo:

1. Criar pesagem com 450 kg e 510 kg.
2. Finalizar.
3. Confirmar historico com exatamente 1 sessao.
4. Recarregar.
5. Confirmar que a calculadora nao restaura o draft finalizado.
6. Confirmar que o historico continua com exatamente 1 sessao.

Evidencia:

```json
{
  "afterFinalize": {
    "rows": 2,
    "totalWeight": "960 kg",
    "feedbackVisible": true,
    "finalizeEnabled": false
  },
  "historyAfterFinalize": {
    "count": 1,
    "totalWeight": "960 kg",
    "averageWeight": "480 kg",
    "arrobas": "32 @"
  },
  "calculatorAfterReload": {
    "name": "",
    "rows": 0,
    "totalAnimals": "0"
  },
  "historyAfterReload": {
    "count": 1,
    "totalWeight": "960 kg"
  }
}
```

Resultado: aprovado.

### C - Editar apos finalizacao

Fluxo:

1. Criar pesagem com 450 kg e 510 kg.
2. Finalizar.
3. Manter a tela visivel.
4. Alterar o primeiro peso para 470 kg.
5. Aguardar autosave.
6. Recarregar.

Evidencia:

```json
{
  "editedRuntime": {
    "weights": ["470", "510"],
    "totalWeight": "980 kg",
    "feedbackVisible": false,
    "finalizeEnabled": true,
    "saveStatus": "Salvo neste dispositivo"
  },
  "editedAfterReload": {
    "weights": ["470", "510"],
    "totalWeight": "980 kg"
  },
  "historyAfterEdit": {
    "count": 1,
    "totalWeight": "960 kg",
    "averageWeight": "480 kg",
    "arrobas": "32 @"
  }
}
```

Resultado: aprovado. A edicao gerou novo draft e o historico anterior permaneceu imutavel.

### D - Card historico completo

Evidencia do texto do card:

```text
Editar Depois
12/08/2026 - Fazenda Editar
2 animais
Peso: 960 kg
Media: 480 kg
Arrobas: 32 @
Valor: R$ 9.600,00
```

Resultado: aprovado. O card contem data, nome, propriedade, quantidade, peso total, peso medio, arrobas e valor estimado.

## Correcao de Race Condition do Autosave

Condicao encontrada pelo CTO:

1. o usuario altera um campo;
2. `scheduleDraftSave()` agenda `saveDraftNow()` com debounce de 500 ms;
3. o usuario finaliza antes do timer executar;
4. a sessao historica e salva;
5. `calculator-current` e removido;
6. um timer antigo poderia recriar `calculator-current`;
7. o reload poderia restaurar uma pesagem ja finalizada.

Correcao implementada:

- apos `saveCompletedSession(snapshot)` retornar `saved`, e antes de `deleteDraft()`, o autosave pendente e cancelado;
- a referencia `state.saveTimer` e limpa;
- `saveDraftNow()` tambem bloqueia salvamento quando a assinatura atual e igual a `finalizedDraftSignature`;
- editar depois da finalizacao continua limpando o estado finalizado antes de agendar novo autosave.

### E - Autosave pendente durante finalizacao

QA comportamental executado em navegador real pelo Codex in-app browser usando locator API em `http://127.0.0.1:8026/index.html`.

Fluxo executado:

1. abrir pesagem valida;
2. aguardar um salvamento inicial;
3. alterar `Nome da pesagem`;
4. confirmar que o status voltou para `Salvando...`;
5. finalizar imediatamente, antes de aguardar novo debounce;
6. aguardar 750 ms apos a finalizacao;
7. recarregar a aplicacao;
8. verificar que a pesagem finalizada nao reaparece como rascunho;
9. verificar que o historico continua com 1 sessao.

Evidencia:

```json
{
  "raceStatusAfterEdit": "Salvando...",
  "raceAfterDebounceWait": {
    "rows": 2,
    "name": "Autosave Race UI Alterada",
    "saveStatus": "Salvo neste dispositivo",
    "feedbackVisible": true,
    "finalizeDisabled": true,
    "historyCount": 1
  },
  "raceAfterReload": {
    "rows": 0,
    "name": "",
    "totalAnimals": "0",
    "historyCount": 1
  }
}
```

Resultado comportamental: aprovado.

Observacao de ambiente: a consulta direta da store `drafts` pelo navegador nao pode ser concluida no Codex in-app browser porque o contexto de automacao nao expos `indexedDB`. Tambem foi tentado Edge headless via CDP; `/json/version` respondeu por PowerShell, mas o WebSocket DevTools foi recusado no ambiente. Por isso, a evidencia acima valida o efeito observavel do requisito por reload real da aplicacao, mas a inspecao direta da store nao foi declarada como executada.

### F - Edicao apos finalizacao com protecao contra timer tardio

Fluxo executado:

1. finalizar uma pesagem valida;
2. manter a tela visivel;
3. editar o primeiro peso de 450 kg para 470 kg;
4. aguardar 750 ms;
5. recarregar;
6. verificar que um novo rascunho foi restaurado;
7. verificar que o historico anterior continua com 1 sessao.

Evidencia:

```json
{
  "editAfterDebounce": {
    "weights": ["470", "510"],
    "total": "980 kg",
    "feedbackVisible": false,
    "finalizeDisabled": false,
    "historyCount": 1
  },
  "editAfterReload": {
    "rows": 2,
    "weights": ["470", "510"],
    "total": "980 kg",
    "historyCount": 1
  }
}
```

Resultado: aprovado. A protecao contra autosave tardio nao impediu o fluxo legitimo de novo rascunho apos edicao.

## Dados de Demonstracao

Fluxo:

1. Carregar dados de exemplo.
2. Verificar banner de demonstracao.
3. Verificar botao `Finalizar pesagem`.
4. Abrir historico.

Resultado obtido:

```json
{
  "demoFinalizeEnabled": false,
  "demoBannerVisible": true,
  "demoHistoryCount": 0
}
```

Resultado: aprovado. `EX-001` e `EX-002` nao foram gravados no historico.

## Validacoes Obrigatorias

| Entrada | Resultado Esperado | Resultado Obtido |
| --- | --- | --- |
| Brinco vazio | Permitido com aviso e exibicao `Sem brinco` | Aprovado |
| Peso vazio | Erro proximo ao campo | Aprovado |
| Peso igual a zero | Erro `O peso deve ser maior que zero.` | Aprovado |
| Peso negativo | Erro `O peso nao pode ser negativo.` | Aprovado |
| Peso nao numerico | Erro `Use apenas numeros no peso.` | Aprovado |
| Preco por arroba negativo | Erro `O preco por arroba nao pode ser negativo.` | Aprovado |
| Rendimento abaixo de 0% | Erro `O rendimento nao pode ser abaixo de 0%.` | Aprovado |
| Rendimento acima de 100% | Erro `O rendimento nao pode passar de 100%.` | Aprovado |
| Brinco duplicado na mesma sessao | Erro `Brinco duplicado nesta pesagem.` | Aprovado |
| Virgula decimal | Aceita | Aprovado |
| Ponto decimal | Aceito | Aprovado |
| HTML/script em campos | Renderizado como texto literal; nenhum dialog ou erro de console | Aprovado |
| Calcular sem animais | Mensagem `Adicione pelo menos um animal para calcular a pesagem.` | Aprovado |
| Finalizar sem animais | Bloqueado por `Adicione pelo menos um animal valido antes de finalizar.` | Aprovado |
| Finalizar com parametros invalidos | Bloqueado | Aprovado |
| Finalizar com animal invalido | Bloqueado | Aprovado |

## CSV

Testes automatizados confirmaram:

- UTF-8 BOM no inicio do arquivo;
- separador ponto e virgula;
- numeros em formato brasileiro;
- acentos preservados;
- aspas, quebras de linha e ponto e virgula escapados;
- neutralizacao de formulas iniciadas por `=`, `+`, `-` e `@`;
- nomes de arquivo sanitizados.

QA de navegador:

- o clique em `Exportar CSV` nao gerou erro visivel nem log de erro;
- a API de download do In-app Browser nao capturou downloads Blob nesta sessao, entao o conteudo baixado foi validado pelos testes automatizados do `CsvExportCore`.

Resultado: aprovado com limitacao operacional da ferramenta de captura de download.

## Romaneio e Impressao

Verificacoes executadas:

- titulo `PLATAFORMA DA PECUARIA`;
- identificacao da propriedade quando preenchida;
- data da pesagem;
- lista de animais;
- peso total;
- peso medio;
- arrobas estimadas;
- valor estimado;
- rendimento utilizado;
- preco por arroba;
- nota de estimativa;
- regras `@media print` escondendo navegacao, menus, botoes e controles de entrada.

Casos:

| Quantidade | Linhas no romaneio | Controles ocultos por CSS de impressao | Status |
| --- | ---: | --- | --- |
| 2 animais | 2 | Sim | Aprovado |
| 30 animais | 30 | Sim | Aprovado |
| 100 animais | 100 | Sim | Aprovado |

Observacao: a API do navegador usado no Codex nao abre a janela nativa de impressao para inspecao humana. A validacao foi feita por DOM, CSS de impressao e screenshot da tela renderizada.

## Responsividade

Viewport 360x800:

```json
{
  "innerWidth": 360,
  "scrollWidth": 345,
  "topbarDirection": "column",
  "workspaceColumns": "321px",
  "tableWrapOverflowX": "auto",
  "tabsOverflowX": "auto"
}
```

Viewport 1280x900:

```json
{
  "innerWidth": 1280,
  "scrollWidth": 1265,
  "topbarDirection": "row",
  "workspaceColumns": "809.312px 389.688px",
  "tableWrapOverflowX": "auto",
  "tabsOverflowX": "auto"
}
```

Resultado: aprovado. Foram capturadas imagens locais de evidencia durante o QA.

## Checagens Estaticas

| Checagem em arquivos executaveis | Resultado |
| --- | --- |
| Ausencia de `innerHTML`, `outerHTML`, `insertAdjacentHTML` em `app.js`, `src` e `index.html` | Aprovado |
| Ausencia de `localStorage` e `sessionStorage` em `app.js`, `src` e `index.html` | Aprovado |
| Ausencia de `serviceWorker` | Aprovado |
| Ausencia de `fetch`, `XMLHttpRequest`, `WebSocket` e `openDatabase` | Aprovado |

## Limitacoes

- O historico ainda e local ao dispositivo.
- Nao ha login, conta, permissao, nuvem ou sincronizacao.
- Nao ha PWA, service worker ou cache offline completo da aplicacao.
- A exportacao CSV por download Blob nao foi capturada pela API do In-app Browser; o conteudo foi validado por testes automatizados e o clique foi validado sem logs de erro.
- Impressao nativa nao foi aberta pelo ambiente de automacao; a validacao usou DOM, CSS de impressao e screenshots.
