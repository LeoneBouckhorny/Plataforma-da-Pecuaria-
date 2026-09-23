# Modelo de Dados V4

## Banco e Compatibilidade

`plataforma-pecuaria`, `DB_VERSION = 4`. Migration aditiva: cria somente
`paddocks`, `lots`, `animals`. Preserva `accounts`, `properties`, `app-settings`,
`drafts`, `weighing-sessions`, `weighing-items` e seus dados/indices.
Nenhuma migracao por nome, nenhum apagamento ou regravacao dos registros legados.

## Account e Property

- Account (`accounts`, chave `id`): `id`, `name`, `status`, `createdAt`, `updatedAt`.
  Operacao local, nao autenticacao. `app-settings`, chave `key`, guarda
  `active-account-id` conforme V3.
- Property (`properties`, chave `id`): `id`, `accountId`, `name`, `municipality`,
  `state`, `notes`, `status`, `createdAt`, `updatedAt`. Indices `accountId`, `status`.
  Nome e contexto da conta obrigatorios. Municipio/UF/observacoes opcionais.

## Campos Comuns do Rebanho

Paddock, Lot e Animal possuem `id`, `accountId`, `propertyId`, `status`,
`createdAt`, `updatedAt`. Chave primaria `id`; indices nao unicos `accountId`,
`propertyId`, `status` nas tres stores. Status `active` ou `archived`.
IDs obrigatorios, estaveis e independentes de nome/brinco, usando a estrategia
existente `crypto.randomUUID()` com fallback local. Criacao usa `add`, portanto
uma colisao nao sobrescreve registro existente.

`id`, `accountId`, `propertyId`, `createdAt` sao imutaveis na edicao; status
somente pelas operacoes de arquivamento/reativacao. Nao ha transferencia.
`updatedAt` muda em cada operacao valida.

## Paddock

Store `paddocks`. Alem dos campos comuns:

| Campo | Regra |
| --- | --- |
| name | Obrigatorio, texto com espacos normalizados |
| areaHectares | Opcional, `null` ou numero finito positivo; virgula/ponto decimal na entrada |
| notes | Texto opcional |

Nao inclui capacidade, lotacao, UA/ha ou mapa nesta versao.

## Lot

Store `lots`. Alem dos campos comuns:

| Campo | Regra |
| --- | --- |
| name | Obrigatorio |
| paddockId | Opcional, `null` ou ID de pasto da mesma conta/propriedade |
| category | Texto livre opcional, sem enum regional |
| notes | Texto opcional |

`paddockId` representa a localizacao atual do agrupamento de manejo.
O lote continua sendo o mesmo quando muda de pasto. Nao existe `animalCount`.

## Animal

Store `animals`. Alem dos campos comuns:

| Campo | Regra |
| --- | --- |
| lotId | Opcional, `null` ou ID de lote da mesma conta/propriedade |
| tag | Texto opcional com trim; permite letras, numeros e hifens |
| name | Texto opcional; exigir `tag` OU `name` |
| sex | `male`, `female`, `unknown`; omissao vira `unknown` |
| category | Texto livre opcional |
| breed | Texto livre opcional |
| birthDate | Opcional `null` ou data ISO YYYY-MM-DD valida |
| notes | Texto opcional |

Sem `paddockId` e sem idade persistida. Sem brinco, o nome permite o cadastro,
sempre com ID interno. Brincos nao sao chaves e podem se repetir entre
propriedades (nenhum indice unico por brinco). Esta versao tambem nao impoe
unicidade dentro da propriedade nem faz deduplicacao automatica.

## Relacoes e Integridade

```text
Account -> Property -> Paddock
                    -> Lot -> paddockId atual (opcional)
                    -> Animal -> lotId atual (opcional)

Localizacao do animal = Animal.lotId -> Lot.paddockId -> Paddock
```

Todos os repositories novos exigem conta E propriedade. Leituras filtram os
dois IDs. Escritas verificam existencia da conta/propriedade, seu contexto e
referencias na mesma transacao readwrite que grava a entidade. Propriedade
arquivada bloqueia alteracoes de rebanho ate ser reativada.

Pasto nao arquiva com lote ativo vinculado; lote nao arquiva com animal ativo.
Filhos arquivados nao bloqueiam arquivamento do pai. A reativacao de um filho
exige pai ativo ou desvinculacao previa; editar filho arquivado permite manter
referencia arquivada existente. Animal arquivado nao significa vendido/morto.

Contadores: COUNT de registros ativos do contexto atual. Contador do lote:
COUNT de animais ativos com seu `lotId`. Nao representa o gado nao cadastrado.

## Draft

Store `drafts`, chave `calculator-current`, schema 2 preservado. Campos novos
aditivos em `data`: `lotId` (null por padrao), `lotName` (string vazia por padrao).
Schemas 1 e 2 continuam legiveis. IDs, animais de pesagem e pastos temporarios
permanecem intactos. Mudar a propriedade limpa lote incompativel sem remover
animais digitados. No reload, vinculo formal so e restaurado se o ID pertencer
ao contexto ativo; nomes nunca criam vinculos.

## WeighingSession

Store `weighing-sessions`, chave `id`, schema 2 aditivo. Campos anteriores
preservados: `createdAt`, `weighingDate`, `accountId`, `propertyId`, `weighingName`,
`propertyNameSnapshot`, parametros/limites/rendimento/preco snapshots, totais,
`observations`, `status` completed. Novos campos:

- `lotId`: ID do lote ou null.
- `lotNameSnapshot`: nome no momento da gravacao, ou vazio.
- `paddockId`: ID do pasto do lote naquele momento, ou null.
- `paddockNameSnapshot`: nome naquele momento, ou vazio.

Gravacao vinculada verifica lote ativo e seu contexto e le pasto na mesma
transacao das stores historicas. Pasto existente do mesmo contexto pode ser
capturado mesmo arquivado. Mudancas posteriores nao alteram snapshots.
Historico antigo normaliza novos IDs para null, sem inferencia textual.
Filtro por `lotId` combina opcionalmente `propertyId`/`accountId`.

## WeighingItem

Store `weighing-items`, chave `id`, indice `sessionId`. Campos: `id`, `sessionId`,
`animalId`, `tagSnapshot`, `categorySnapshot`, `weightSnapshot`, `noteSnapshot`,
`weightBandSnapshot`, `arrobasSnapshot`. Novas pesagens mantem `animalId = null`.
Brinco igual no cadastro nao autoriza associacao automatica.

## Recuperacao e Limites

Upgrade e transacional e nao destrutivo; falha na transacao aborta gravacoes
parciais. Nao existe downgrade destrutivo ou limpeza automatica. Fechar abas
antigas libera upgrade bloqueado. Dados continuam exclusivos do dispositivo;
limpar armazenamento pode remove-los. Backup/sincronizacao exigem sprint propria.
