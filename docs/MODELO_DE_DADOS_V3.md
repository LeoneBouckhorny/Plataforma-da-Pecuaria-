# Modelo de Dados V3

A Sprint 004 evolui o modelo local-first para organizar a calculadora por operacao local e multiplas propriedades. Nao ha login, nuvem, sincronizacao, backend ou multiusuario real nesta versao.

## IndexedDB

Banco local:

- nome: `plataforma-pecuaria`;
- versao: `3`.

Object stores finais:

- `drafts`;
- `weighing-sessions`;
- `weighing-items`;
- `accounts`;
- `properties`;
- `app-settings`.

Indices:

- `weighing-items.sessionId`, com `unique: false`;
- `properties.accountId`, com `unique: false`;
- `properties.status`, com `unique: false`.

## Conta ou Operacao Local

Persistencia formal nesta sprint.

Store:

- `accounts`.

Chave:

- `id`.

Campos:

- `id`: obrigatorio, identificador estavel gerado localmente;
- `name`: obrigatorio, nome da operacao;
- `status`: obrigatorio, valor atual `active`;
- `createdAt`: obrigatorio, data/hora ISO de criacao;
- `updatedAt`: obrigatorio, data/hora ISO de atualizacao.

Regras:

- existe somente uma operacao local ativa por instalacao nesta sprint;
- o ID nao deve ser um valor global fixo compartilhado entre dispositivos;
- a operacao local nao e login, senha, e-mail, assinatura, nuvem ou sincronizacao;
- a operacao local prepara a arquitetura para conta remota futura.

## App Settings

Store:

- `app-settings`.

Chave:

- `key`.

Uso inicial:

- `key`: `active-account-id`;
- `value`: ID da operacao local ativa.

Regras:

- uso restrito para configuracoes estruturais pequenas;
- nao deve virar deposito indiscriminado de dados do produtor.

## Propriedade

Persistencia formal nesta sprint.

Store:

- `properties`.

Chave:

- `id`.

Campos:

- `id`: obrigatorio, identificador estavel;
- `accountId`: obrigatorio, vinculo com `accounts.id`;
- `name`: obrigatorio;
- `municipality`: opcional;
- `state`: opcional, normalizado como UF quando informado;
- `notes`: opcional;
- `status`: obrigatorio, `active` ou `archived`;
- `createdAt`: obrigatorio;
- `updatedAt`: obrigatorio.

Regras:

- nome nao e chave;
- nomes iguais sao permitidos tecnicamente;
- municipio/UF ajudam a diferenciar nomes iguais na interface;
- arquivamento nao apaga historico;
- propriedades arquivadas nao aparecem normalmente para nova pesagem;
- propriedades arquivadas continuam disponiveis em filtros quando possuem historico.

## Pasto ou Piquete

Entidade conceitual registrada no modelo, mas sem persistencia formal nesta sprint.

Na Sprint 004, pastos continuam como configuracao temporaria da pesagem em andamento dentro do draft.

Campos conceituais futuros:

- `id`;
- `propertyId`;
- `name`;
- `maxCapacity`;
- `notes`;
- `status`.

## Lote

Entidade conceitual futura, sem persistencia formal nesta sprint.

Campos conceituais:

- `id`;
- `accountId`;
- `propertyId`;
- `paddockId`;
- `name`;
- `category`;
- `status`.

## Animal

Entidade conceitual futura, sem persistencia formal nesta sprint.

Campos conceituais:

- `id`;
- `accountId`;
- `propertyId`;
- `lotId`;
- `tag`;
- `category`;
- `notes`;
- `status`.

Regras futuras:

- `id` interno sera a chave primaria real;
- brinco nao deve ser chave global;
- animais sem brinco devem receber ID interno estavel quando houver cadastro individual.

## Sessao de Pesagem

Store:

- `weighing-sessions`.

Campos relevantes V3:

- `accountId`: ID da operacao local ativa ou `null` em registros legados;
- `propertyId`: ID da propriedade cadastrada selecionada ou `null`;
- `propertyNameSnapshot`: nome textual salvo no momento da finalizacao.

Regra critica:

- `propertyId` identifica o cadastro atual;
- `propertyNameSnapshot` preserva o nome historico exibido no romaneio.

Exemplo:

```text
Cadastro atual: Boa Vista - Unidade Principal
Snapshot antigo: Boa Vista
```

A pesagem antiga deve continuar exibindo `Boa Vista`.

## Item de Pesagem

Store:

- `weighing-items`.

Sem mudanca estrutural na Sprint 004.

Campos principais:

- `id`;
- `sessionId`;
- `animalId`;
- `tagSnapshot`;
- `categorySnapshot`;
- `weightSnapshot`;
- `noteSnapshot`;
- `weightBandSnapshot`;
- `arrobasSnapshot`.

## Draft

Store:

- `drafts`.

O draft atual passa a suportar:

- `accountId`;
- `propertyId`;
- `propertyName`.

Regras:

- draft antigo sem `accountId` e `propertyId` continua compativel;
- ao carregar draft antigo, a UI pode associar `accountId` a operacao local ativa;
- `propertyId` antigo ausente permanece `null`;
- nao adivinhar propriedade cadastrada por comparacao de nome;
- `propertyName` textual antigo deve ser preservado.

## Relacionamentos

- Uma operacao local possui muitas propriedades.
- Uma propriedade pertence a uma operacao local.
- Uma sessao de pesagem pode pertencer a uma propriedade.
- Uma sessao de pesagem possui muitos itens.
- Um item pertence a uma sessao.
- Pastos, lotes e animais permanecem conceituais para sprints futuras.

## Compatibilidade V2 -> V3

Migration:

- cria `accounts`;
- cria `properties`;
- cria `app-settings`;
- preserva `drafts`;
- preserva `weighing-sessions`;
- preserva `weighing-items`;
- preserva indice `weighing-items.sessionId`.

Depois da migration, a aplicacao garante uma operacao local ativa quando nenhuma existir.
