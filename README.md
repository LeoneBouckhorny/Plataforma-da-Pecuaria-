# Plataforma da Pecuaria

Base inicial da Plataforma da Pecuaria, com foco em uma porta de entrada simples para o produtor rural: uma calculadora de pesagem que estima peso, arrobas e valor do lote.

## Direcao do produto

- Resolver uma dor imediata antes de vender gestao.
- Manter o plano gratuito util de verdade.
- Apresentar o plano pago sem pressao.
- Funcionar bem no celular.
- Construir a base local-first antes de qualquer sincronizacao futura.
- Usar benchmarks de mercado apenas para entender fluxos e superar a experiencia, sem copiar produto.

## MVP gratuito

- Calculadora de pesagem por animal/lote.
- Cotacao regional por arroba.
- Rendimento de carcaca configuravel.
- Valor estimado do lote.
- Separacao visual por faixas de peso.
- Romaneio V1 para impressao.
- Exportacao CSV com UTF-8 BOM e separador ponto e virgula.
- Rascunho da pesagem atual preservado neste dispositivo com IndexedDB.
- Historico local de pesagens finalizadas neste dispositivo.
- Operacao local editavel neste dispositivo.
- Multiplas propriedades locais, com arquivamento e reativacao.
- Area Rebanho com pastos/piquetes, lotes e animais por propriedade.
- Ficha individual com linha do tempo, observacoes datadas e mudancas de lote.
- Pesagens explicitamente vinculadas a animais; ultimo peso e contagem derivados.
- Local atual do lote definido por pasto opcional; animal vinculado a lote opcional.
- Cadastro individual com brinco ou nome, sem associacao automatica a itens de pesagem.
- Pesagem opcionalmente vinculada a lote e filtro historico por ID do lote.
- Selecao de propriedade por pesagem, sem tornar o cadastro obrigatorio.
- Filtro de historico por propriedade ou por sessoes sem vinculo.
- PWA instalavel em navegadores compativeis.
- App shell disponivel offline apos primeiro carregamento adequado.

## Persistencia local

A aplicacao preserva uma pesagem em andamento no mesmo dispositivo. Ao fechar ou recarregar a pagina, o rascunho real mais recente pode ser restaurado.

Essa persistencia local nao significa:

- cache offline completo da aplicacao;
- sincronizacao em nuvem;
- login;
- backup remoto.

Dados de demonstracao nao sao persistidos. O botao `Limpar pesagem` remove o rascunho local `calculator-current` e restaura a tela vazia com os parametros padrao.

Na Sprint 002, a aplicacao tambem salva sessoes finalizadas em historico local. Esse historico usa snapshots e nao muda quando o rascunho atual e editado depois. O historico ainda fica somente no dispositivo e nao substitui backup, conta ou sincronizacao.

Na Sprint 004, a aplicacao cria uma operacao local e permite cadastrar varias propriedades neste dispositivo. A operacao local nao e login: nao possui e-mail, senha, nuvem, assinatura ou sincronizacao. Ela serve apenas para organizar dados locais e preparar a arquitetura para uma conta real no futuro.

Propriedades cadastradas recebem IDs estaveis e podem ser arquivadas ou reativadas. O arquivamento nao apaga historico. Pesagens finalizadas gravam `propertyId` quando ha propriedade selecionada e tambem gravam `propertyNameSnapshot`, preservando o nome usado no momento da finalizacao mesmo que o cadastro seja renomeado depois.

Na Sprint 006, IndexedDB V4 adiciona `paddocks`, `lots` e `animals`, sem regravar
os registros anteriores. Cada entidade pertence a uma operacao e propriedade.
O animal possui `lotId`; sua localizacao e derivada do `paddockId` do lote.
Um pasto com lote ativo e um lote com animal ativo nao podem ser arquivados.
Nao ha exclusao definitiva desses cadastros nem transferencia entre propriedades.
Historicos vinculados preservam os nomes do lote e pasto no momento da gravacao.
Os contadores mostram animais ativos cadastrados, nao uma estimativa de todo o gado fisico.

Na Sprint 007, IndexedDB V5 adiciona `animal-events` e o indice `animalId` nos
itens de pesagem existentes. A ficha combina eventos administrativos/observacoes
com pesagens vinculadas, sem duplicar peso em eventos. Cadastro, mudanca de lote,
arquivamento e reativacao geram eventos atomicamente. Observacoes podem ser
editadas; eventos automaticos nao. Nascimento e cadastro legado sao marcos
derivados, sem inventar eventos retroativos.

A vinculacao individual exige selecionar explicitamente o animal na linha da
calculadora. Brinco igual nunca cria vinculo. Animais arquivados continuam com
historico, mas nao ficam disponiveis para nova pesagem. Trocar propriedade/lote
limpa somente vinculos incompativeis, preservando pesos e textos digitados.

## PWA e uso offline

Na Sprint 003, a aplicacao passou a registrar um Service Worker e um Web App Manifest. Em navegadores compativeis, ela pode ser instalada como aplicativo e pode abrir sem internet depois de ter sido carregada online pelo menos uma vez em contexto compativel com Service Worker.

O funcionamento offline cobre:

- abertura da aplicacao apos o app shell estar cacheado;
- calculadora de pesagem;
- rascunho local no IndexedDB;
- finalizacao de pesagens;
- consulta e exclusao de historico local;
- criacao, edicao, arquivamento e reativacao de propriedades locais;
- selecao de propriedade e filtro de historico;
- cadastro, edicao e arquivamento/reativacao do rebanho conforme seus vinculos;
- mudanca do pasto atual do lote e do lote atual do animal;
- pesagem vinculada opcionalmente a lote e consulta dos snapshots historicos;
- ficha individual, timeline, observacoes, mudanca de lote e status com eventos;
- pesagens vinculadas explicitamente e ultimo peso derivado;
- geracao de CSV em memoria;
- preparacao do romaneio para impressao.

Ainda nao existe:

- login;
- nuvem;
- backup remoto;
- sincronizacao entre dispositivos;
- compartilhamento;
- recuperacao de dados em outro aparelho.

O navegador pode remover dados locais conforme suas proprias politicas de armazenamento. IndexedDB e Cache Storage melhoram o uso offline, mas nao substituem uma estrategia futura de backup.

## Gestao premium futura

- Lotacao maxima opcional por pasto.
- GMD e graficos de evolucao, apos consolidacao do historico individual.
- Vacinas, reproducao, nascimento, castracao, compra, venda e mortalidade.
- Historico de movimentacoes e transferencia entre propriedades.
- Despesas e permissoes para funcionarios.

## Como abrir para desenvolvimento

Para QA da persistencia local, prefira servir o projeto via servidor local ou Live Preview. Exemplo:

```powershell
python -m http.server 8026 --bind 127.0.0.1
```

Depois acesse:

```text
http://127.0.0.1:8026/index.html
```

Abrir o HTML diretamente pode funcionar para leitura visual, mas o teste de IndexedDB deve ser feito em um contexto de navegador servido localmente.

Para QA de PWA e Service Worker, use `http://127.0.0.1:8026/index.html` ou outro localhost. Em producao, Service Worker exige HTTPS.

## Identidade visual

A Sprint 005 aplica o simbolo aprovado (bovino, dados e campo), com paleta
centralizada e componentes reutilizaveis. `styles.css` agrega as camadas
em `styles/`; a marca fica em `assets/branding/` e os icones em `assets/`.
Montserrat permanece como referencia com fallback local system-ui/Segoe UI,
sem fonte externa. O app shell atual v5 preserva os assets visuais e inclui os modulos de rebanho e historico individual.

Detalhes: `docs/DESIGN_SYSTEM_V1.md`, `docs/ADR_005_IDENTIDADE_VISUAL.md`
e `docs/QA_SPRINT_005.md`. Para servir com Node.js, tambem e possivel usar
`node scripts/serve.cjs` e acessar `http://127.0.0.1:8026/index.html`.

## Testes automatizados

Execute a checagem de sintaxe:

```powershell
node --check app.js
node --check src/calculator-core.js
node --check src/property-core.js
node --check src/local-data-core.js
node --check src/local-database.js
node --check src/account-repository.js
node --check src/property-repository.js
node --check src/draft-repository.js
node --check src/weighing-history-core.js
node --check src/weighing-repository.js
node --check src/csv-export-core.js
node --check src/pwa-controller.js
node --check sw.js
```

Execute os testes automatizados:

```powershell
node --test tests/*.test.js
```

O QA da Sprint 006 esta em `scripts/qa-sprint-006.cjs`. Ele exige Playwright
disponivel no ambiente de desenvolvimento (nao e dependencia do aplicativo).
Use `QA_BROWSER_PATH` para indicar um Chromium/Edge local; sem essa variavel,
o runner procura Edge/Chrome nos caminhos comuns de Windows e depois usa o
Chromium do Playwright. Execute `node scripts/qa-sprint-006.cjs`.
O runner cria dados em contexto isolado e usa um servidor temporario, sem
alterar os registros da instalacao do produtor.

Documentacao atual: `docs/MODELO_DE_DADOS_V5.md`,
`docs/ADR_007_HISTORICO_ANIMAL.md`, `docs/QA_SPRINT_007.md`.
Runner atual: `node scripts/qa-sprint-007.cjs`, com Playwright disponivel no
ambiente de QA e `QA_BROWSER_PATH` opcional. Nenhuma dependencia do aplicativo
foi adicionada. O runner serve a base aprovada `1682473` para testar o upgrade
real V4 -> V5 e encerra o servidor durante o teste offline.

Ainda nao existem GMD, graficos de peso, movimentacao historica de lotes entre
pastos, compra/venda/morte, transferencia entre propriedades, sanidade,
reproducao, financeiro, nuvem ou sincronizacao. Sprint 008 nao iniciada.
