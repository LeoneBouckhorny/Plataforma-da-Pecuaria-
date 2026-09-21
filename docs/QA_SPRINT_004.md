# QA Sprint 004 - Conta Local e Multiplas Propriedades

Data da execucao: 2026-09-04  
Branch verificada: `feature/sprint-004-multiple-properties`  
Ambiente automatizado: Node.js `node --test` e Microsoft Edge headless via Chrome DevTools Protocol  
Servidor local do QA: `http://127.0.0.1:8044/index.html`

## Objetivo do QA

Validar operacao local, multiplas propriedades, migration V2 -> V3, selecao de propriedade na pesagem, filtro do historico por `propertyId`, snapshots historicos, arquivamento, PWA cache v2 e funcionamento offline.

## Testes Automatizados

Comando executado:

```bash
node --test tests/*.test.js
```

Resultado obtido:

```text
tests 87
pass 87
fail 0
```

Coberturas adicionadas:

- `tests/property-core.test.js`;
- `tests/account-repository.test.js`;
- `tests/property-repository.test.js`;
- novos cenarios em `tests/local-data-core.test.js`;
- novo cenario em `tests/draft-repository.test.js`;
- novos cenarios em `tests/weighing-history-core.test.js`;
- novos cenarios em `tests/weighing-repository.test.js`;
- atualizacao de testes PWA para cache v2 e novos modulos no app shell.

## QA Migration V2 -> V3

Entrada:

- banco V2 criado no navegador com:
  - draft real;
  - uma sessao historica;
  - um item historico;
  - cache PWA antigo `plataforma-pecuaria-shell-v1`;
- abertura da aplicacao Sprint 004.

Resultado esperado:

- `DB_VERSION = 3`;
- stores novas criadas;
- draft preservado;
- historico preservado;
- itens preservados;
- operacao local criada;
- `active-account-id` criado;
- cache v2 instalado;
- cache v1 removido apos ativacao apropriada;
- IndexedDB preservado.

Resultado obtido:

```text
version: 3
stores: accounts, app-settings, drafts, properties, weighing-items, weighing-sessions
draftPreserved: true
historyPreserved: true
itemsPreserved: true
accountCreated: true
activeSettingCreated: true
propertiesStoreCreated: true
cacheV2: true
cacheV1Removed: true
```

## QA A - Multiplas Propriedades

Entrada:

- renomear operacao para `Operação Teste`;
- criar:
  - Boa Vista, Uberaba - MG;
  - São Romão, Araxá - MG;
  - Sítio do Avô, Franca - SP;
- recarregar a aplicacao.

Resultado esperado:

- operacao persiste;
- tres propriedades persistem;
- cada propriedade possui ID proprio;
- propriedades aparecem no seletor da calculadora.

Resultado obtido:

```text
accountName: Operação Teste
propertyCards apos reload: 3
Boa Vista: ativa, Uberaba - MG
São Romão: ativa, Araxá - MG
Sítio do Avô: ativa, Franca - SP
```

## QA B - Pesagem Boa Vista

Entrada:

- selecionar Boa Vista;
- inserir 450 kg e 510 kg;
- preco: R$ 300,00/@;
- rendimento: 50%;
- finalizar.

Resultado esperado:

- totais: 2 animais, 960 kg, media 480 kg, 32 @, R$ 9.600,00;
- sessao finalizada grava `propertyId` de Boa Vista;
- snapshot grava `Boa Vista`.

Resultado obtido:

```text
totalAnimals: 2
totalWeight: 960 kg
averageWeight: 480 kg
arrobas: 32 @
value: R$ 9.600,00
propertyId: ID da Boa Vista
propertyNameSnapshot: Boa Vista
estimatedValue: 9600
```

## QA C - Segunda Propriedade

Entrada:

- nova pesagem;
- selecionar São Romão;
- inserir 520 kg e 480 kg;
- finalizar.

Resultado esperado:

- Boa Vista possui 1 sessao;
- São Romão possui 1 sessao;
- dados nao se misturam.

Resultado obtido:

```text
São Romão totalWeight: 1.000 kg
São Romão averageWeight: 500 kg
Boa Vista: 1
São Romão: 1
```

## QA D - Filtro de Historico

Entrada:

- abrir historico;
- filtrar por Boa Vista;
- filtrar por São Romão;
- filtrar por Todas as propriedades;
- filtrar por Sem vinculo.

Resultado esperado:

- Boa Vista mostra somente Boa Vista;
- São Romão mostra somente São Romão;
- Todas mostra as duas sessoes;
- Sem vinculo nao associa sessoes por nome parecido.

Resultado obtido:

```text
Boa Vista: 1
São Romão: 1
Todas: 2
Sem vínculo: 0
```

## QA E - Renomeacao e Snapshot

Entrada:

- com pesagem antiga da Boa Vista salva;
- renomear cadastro para `Boa Vista - Unidade Principal`;
- consultar historico antigo;
- criar nova pesagem na mesma propriedade renomeada.

Resultado esperado:

- historico antigo continua exibindo `Boa Vista`;
- seletor atual usa `Boa Vista - Unidade Principal`;
- nova pesagem usa o novo snapshot;
- filtro continua por `propertyId`.

Resultado obtido:

```text
oldBoaDetailProperty: Boa Vista
renamedOldDetailProperty: Boa Vista
currentOption: Boa Vista - Unidade Principal (Uberaba - MG)
snapshots: Boa Vista, Boa Vista - Unidade Principal
```

## QA F - Arquivamento

Entrada:

- arquivar São Romão;
- consultar historico filtrado por São Romão;
- verificar seletor da calculadora;
- reativar São Romão;
- verificar seletor novamente.

Resultado esperado:

- propriedade arquivada permanece no cadastro;
- historico continua disponivel;
- São Romão nao aparece para nova pesagem enquanto arquivada;
- ao reativar, volta a aparecer.

Resultado obtido:

```text
archivedStatus: archived
selectHasArchived: false
historyCountWhileArchived: 1
reactivatedStatus: active
selectHasReactivated: true
```

## QA G - Offline

Entrada:

- apos PWA estar controlado, simular offline;
- criar `Fazenda Offline`;
- recarregar ainda offline;
- selecionar `Fazenda Offline`;
- criar pesagem 450 kg + 510 kg;
- finalizar;
- consultar historico.

Resultado esperado:

- propriedade criada offline persiste apos reload;
- pesagem finaliza offline;
- historico funciona offline;
- sessao fica vinculada ao `propertyId` da Fazenda Offline.

Resultado obtido:

```text
propertyPersistedAfterReload: true
totalAnimals: 2
totalWeight: 960 kg
averageWeight: 480 kg
arrobas: 32 @
value: R$ 9.600,00
historyProperty: Fazenda Offline
sessions: 1
```

## QA Responsivo

Entrada:

- viewport 360 x 800;
- viewport 1280 x 900.

Resultado esperado:

- `document.documentElement.scrollWidth <= window.innerWidth`;
- lista de propriedades utilizavel no celular.

Resultado obtido:

```text
360px: innerWidth 360, scrollWidth 360
1280px: innerWidth 1280, scrollWidth 1265
```

## QA PWA

Verificacoes:

- cache versionado atual: `plataforma-pecuaria-shell-v2`;
- novos modulos no app shell:
  - `./src/property-core.js`;
  - `./src/account-repository.js`;
  - `./src/property-repository.js`;
- cache antigo com prefixo da aplicacao removido;
- IndexedDB preservado;
- sem `skipWaiting()` automatico;
- sem Workbox;
- sem backend;
- sem sincronizacao.

Resultado obtido:

```text
cacheV2: true
cacheV1Removed: true
```

## Limitacoes Conhecidas

- A operacao local ainda nao e conta na nuvem.
- Dados continuam dependentes do armazenamento local do navegador/dispositivo.
- Nao ha backup, login, sincronizacao, multiusuario, permissoes ou recuperacao remota.
- Propriedades podem ter nomes iguais; a diferenciacao visual usa municipio/UF quando informados.
- Cadastro definitivo de pastos, lotes e animais ficou fora do escopo.
- Homologacao fisica Android fica para o CEO apos aprovacao tecnica, conforme definido na sprint.
