# QA Sprint 003 - PWA, Instalacao e Funcionamento Offline

Data da execucao: 2026-09-04  
Branch verificada: `feature/sprint-003-pwa-offline`  
Ambiente automatizado: Node.js `node --test` e Microsoft Edge headless via Chrome DevTools Protocol  
Servidor local do QA: `http://127.0.0.1:8033/index.html`

## Objetivo do QA

Validar que a aplicacao carrega uma vez com rede, instala o app shell no Service Worker, continua abrindo offline, permite criar uma pesagem, finalizar a sessao localmente e consultar o historico sem depender de internet.

## Testes Automatizados de Codigo

Comando executado:

```bash
node --test tests/*.test.js
```

Resultado obtido:

```text
tests 66
pass 66
fail 0
```

Cobertura adicionada nesta sprint:

- `tests/pwa-config.test.js`: manifest, HTML, registro do Service Worker, fluxo de instalacao, indicador online/offline e regras do `sw.js`.
- `tests/pwa-assets.test.js`: app shell, existencia dos arquivos cacheados e dimensoes dos icones PNG.
- Regressao de cache de navegacao: `isAppEntryNavigation()` permite atualizar o fallback somente para `./` e `./index.html`, incluindo query/hash, e rejeita `README.md`, `manifest.webmanifest`, `styles.css`, JavaScript, imagem e origem externa.

## Teste Critico - Ciclo Offline Completo

Entrada:

- primeiro carregamento com rede;
- service worker ativado;
- rede simulada como offline;
- pagina fechada e aberta novamente no mesmo perfil do navegador;
- pesagem criada offline:
  - Animal 1: 450 kg;
  - Animal 2: 510 kg;
  - preco por arroba: R$ 300,00;
  - rendimento: 50%;
- finalizacao da pesagem offline;
- consulta do historico offline;
- recarregamento offline apos finalizar.

Resultado esperado:

- aplicacao abre offline depois do primeiro carregamento;
- pesagem pode ser preenchida offline;
- rascunho e salvo no IndexedDB;
- totais calculados: 2 animais, 960 kg, media 480 kg, 32 @, R$ 9.600,00;
- finalizacao grava exatamente 1 sessao historica e 2 itens;
- `calculator-current` e removido apos finalizar;
- historico abre offline;
- apos recarregar, a pesagem finalizada nao reaparece como rascunho;
- historico continua com exatamente 1 sessao.

Resultado obtido:

```text
serviceWorkerInstalled: true
offlineBoot: true
closeOpenOffline: true
offlineDraft: true
offlineFinalizeHistory: true
passed: 12
failed: 0
```

Evidencia principal do navegador:

```text
cache ativo: plataforma-pecuaria-shell-v1
Service Worker: activated
pagina controlada: true
draft offline: existe
DB_VERSION: 2
sessoes apos finalizar: 1
itens apos finalizar: 2
draft apos finalizar: nao existe
historico apos reload offline: Pesagem Offline
peso total: 960 kg
peso medio: 480 kg
arrobas: 32 @
valor estimado: R$ 9.600,00
```

## Service Worker e Cache Storage

Entrada:

- carregar a aplicacao com rede;
- aguardar `navigator.serviceWorker.ready`;
- consultar Cache Storage;
- validar cada item do app shell.

Resultado esperado:

- cache `plataforma-pecuaria-shell-v1` criado;
- todos os arquivos essenciais presentes;
- Service Worker ativo e controlando a pagina.

Resultado obtido:

```text
cacheKeys: plataforma-pecuaria-shell-v1
state: activated
controller: true
```

Arquivos confirmados no cache:

- `./`
- `./index.html`
- `./styles.css`
- `./app.js`
- `./manifest.webmanifest`
- `./src/calculator-core.js`
- `./src/local-data-core.js`
- `./src/local-database.js`
- `./src/draft-repository.js`
- `./src/weighing-history-core.js`
- `./src/weighing-repository.js`
- `./src/csv-export-core.js`
- `./src/pwa-controller.js`
- `./assets/icons/icon-180.png`
- `./assets/icons/icon-192.png`
- `./assets/icons/icon-512.png`
- `./assets/icons/icon-maskable-512.png`

## Correcao Final - Protecao do App Shell

Problema apontado pelo CTO:

- `networkFirstNavigation()` podia gravar qualquer resposta bem-sucedida de navegacao same-origin em `INDEX_URL`;
- uma navegacao para `README.md`, `manifest.webmanifest`, CSS ou outro arquivo local poderia substituir o `index.html` cacheado;
- em modo offline, o fallback poderia devolver o conteudo errado em vez da aplicacao.

Protecao implementada:

- `sw.js` passou a usar `isAppEntryNavigation(url)`;
- somente navegacoes para a raiz do app (`./`) ou para `./index.html` podem atualizar a copia cacheada em `INDEX_URL`;
- query string e hash sao ignorados com seguranca nessa decisao;
- recursos locais nao-index continuam seguindo a politica aprovada de assets estaticos, sem substituir o fallback de navegacao.

Teste automatizado sem navegador:

```text
./: permitido
./?origem=pwa#topo: permitido
./index.html: permitido
./index.html?versao=local#inicio: permitido
./README.md: rejeitado
./manifest.webmanifest: rejeitado
./styles.css: rejeitado
./app.js: rejeitado
./assets/icons/icon-192.png: rejeitado
origem externa: rejeitada
```

Teste de navegador - Protecao do App Shell:

Entrada:

- carregar aplicacao online;
- confirmar `index.html` correto no cache;
- navegar com sucesso para `README.md`;
- navegar com sucesso para `manifest.webmanifest`;
- navegar com sucesso para `styles.css`;
- inspecionar `INDEX_URL` no Cache Storage apos cada tentativa;
- colocar offline;
- abrir `index.html` novamente.

Resultado esperado:

- `INDEX_URL` permanece contendo o HTML da Plataforma da Pecuaria;
- README, manifest e CSS nao substituem o fallback;
- offline, o app continua carregando normalmente.

Resultado obtido no Edge headless:

```text
initialIndexCorrect: true
README.md sameAsInitial: true
manifest.webmanifest sameAsInitial: true
styles.css sameAsInitial: true
offlineFallbackStillApp: true
passed: 5
failed: 0
```

## Atualizacao de Cache Antigo

Entrada:

- criar previamente um cache simulado `plataforma-pecuaria-shell-old`;
- carregar a aplicacao;
- aguardar ativacao do Service Worker;
- consultar caches restantes.

Resultado esperado:

- cache antigo com prefixo da aplicacao removido no `activate`;
- cache atual preservado.

Resultado obtido:

```text
oldCacheRemoved: true
cacheKeysAfterActivate: plataforma-pecuaria-shell-v1
```

## Rascunho Offline

Entrada:

- navegador offline;
- incluir a pesagem "Pesagem Offline";
- incluir dois animais;
- aguardar autosave;
- recarregar ainda offline.

Resultado esperado:

- totais corretos;
- rascunho restaurado apos reload offline.

Resultado obtido:

```text
linhas: 2
quantidade: 2
peso total: 960 kg
peso medio: 480 kg
arrobas: 32 @
valor: R$ 9.600,00
draftExists: true
```

## Finalizacao e Historico Offline

Entrada:

- finalizar a pesagem criada offline;
- abrir o historico;
- abrir o detalhe;
- recarregar offline e abrir o historico novamente.

Resultado esperado:

- sessao finalizada salva no historico;
- itens preservados;
- rascunho removido;
- historico consultavel offline antes e depois do reload.

Resultado obtido:

```text
sessoes: 1
itens: 2
draftExists: false
nome: Pesagem Offline
animais: 2
peso total: 960 kg
peso medio: 480 kg
arrobas: 32 @
valor: R$ 9.600,00
```

## Impressao Offline

Entrada:

- abrir detalhe do historico offline;
- gerar PDF pelo mecanismo de impressao do Edge headless (`Page.printToPDF`).

Resultado esperado:

- impressao disponivel offline;
- conteudo do detalhe usado como origem da impressao;
- valores principais presentes na tela antes da impressao.

Resultado obtido:

```text
PDF gerado offline: 61781 bytes
nome no relatorio: Pesagem Offline
peso total: 960 kg
valor: R$ 9.600,00
```

Observacao: a impressao fisica depende do navegador, sistema operacional e impressora. Nesta sprint foi validada a geracao do documento pelo navegador enquanto a pagina estava offline.

## CSV Offline

Entrada:

- gerar CSV em modo offline a partir do core de exportacao;
- incluir observacao iniciada com `=`.

Resultado esperado:

- CSV gerado sem rede;
- BOM UTF-8 presente;
- protecao contra formula injection aplicada;
- totais presentes.

Resultado obtido:

```text
tamanho: 447 caracteres
hasBom: true
hasFormulaProtection: true
hasTotals: true
```

## Exclusao Offline

Entrada:

- excluir a sessao do historico enquanto offline.

Resultado esperado:

- sessao removida;
- itens associados removidos.

Resultado obtido:

```text
sessoes: 0
itens: 0
```

## Reconexao

Entrada:

- depois das operacoes offline, restaurar rede no navegador.

Resultado esperado:

- aplicacao continua funcional;
- nenhum dado local e apagado por reconexao;
- nenhuma sincronizacao remota e iniciada, pois ainda nao existe backend.

Resultado obtido:

```text
saveStatus: Salvo neste dispositivo
connectionHidden: true
historyCount apos exclusao: 0
```

## Viewports

Entrada:

- emular viewport mobile de 360 x 800;
- emular desktop de 1280 x 900.

Resultado esperado:

- sem overflow horizontal;
- interface continua carregando e calculando.

Resultado obtido:

```text
360px: innerWidth 360, scrollWidth 360
1280px: innerWidth 1280, scrollWidth 1265
```

## Instalacao PWA

Verificacoes automatizadas:

- `manifest.webmanifest` presente e referenciado no HTML;
- `display: standalone`;
- `start_url`, `scope` e `id` relativos;
- icones PNG existem e possuem dimensoes esperadas;
- botao `Instalar aplicativo` so depende de `beforeinstallprompt`;
- nao foi usado elemento inexistente `<install>`;
- nao foi usada API inexistente `navigator.install`.

Limite do ambiente:

- o evento real `beforeinstallprompt` nao foi disparado pelo Edge headless durante o QA. A logica foi validada por teste de codigo e a instalabilidade estrutural foi validada por manifest, icones e Service Worker.

## Dados Existentes e Banco Local

Verificacoes:

- `DB_VERSION` permaneceu `2`;
- nenhuma migration nova foi criada;
- nenhuma store foi adicionada, removida ou alterada;
- fluxo de `drafts`, `weighing-sessions` e `weighing-items` continuou funcionando offline.

Resultado obtido:

```text
DB_VERSION no navegador: 2
drafts: utilizado para calculator-current
weighing-sessions: utilizado para historico
weighing-items: utilizado para itens da sessao
```

## Limitacoes Conhecidas

- O primeiro carregamento ainda precisa ocorrer com rede e em contexto compativel com Service Worker.
- IndexedDB continua sendo armazenamento local do navegador, nao backup permanente.
- Nao ha login, nuvem, sincronizacao, recuperacao remota, notificacoes push ou Background Sync nesta sprint.
- Instalacao PWA varia por navegador e sistema operacional.
- QA visual foi feito por viewport e metricas de layout no Edge headless; nao houve avaliacao manual em dispositivo fisico.
