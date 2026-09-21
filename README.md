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

- Pastos/piquetes opcionais por propriedade.
- Lotacao maxima opcional por pasto.
- Lotes e animais individuais.
- Historico de peso.
- Vacinas, reproducao, nascimento, castracao, compra, venda e mortalidade.
- Movimentacao entre propriedades e pastos.
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

## Testes

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
