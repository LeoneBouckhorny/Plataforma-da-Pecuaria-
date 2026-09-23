# Modelo de Dados V5

## Banco e Migration

Banco `plataforma-pecuaria`, `DB_VERSION = 5`. Preserva as nove stores V4:
`accounts`, `properties`, `app-settings`, `drafts`, `paddocks`, `lots`, `animals`,
`weighing-sessions`, `weighing-items`. Adiciona `animal-events` e o indice
nao unico `animalId` na store `weighing-items` existente. O indice `sessionId`
permanece. Nenhuma store antiga e recriada, nenhum registro e regravado durante
o upgrade e nenhum vinculo/evento retroativo e gerado.

Demais entidades e relacoes continuam como descritas em `MODELO_DE_DADOS_V4.md`.
Animal continua sem `paddockId`; local atual deriva de Animal.lotId -> Lot.paddockId.

## AnimalEvent

Store `animal-events`, keyPath `id`. Indices nao unicos: `accountId`,
`propertyId`, `animalId`, `type`, `occurredAt`.

| Campo | Regra |
| --- | --- |
| id | ID local estavel, nao derivado de brinco/nome |
| accountId, propertyId, animalId | Obrigatorios, animal existente e mesmo contexto |
| type | Enum registered, lot_changed, status_changed, note |
| occurredAt | Timestamp ISO com fuso, data e hora validas |
| fromLotId, fromLotNameSnapshot | Origem da mudanca; null quando nao aplicavel/sem lote |
| fromPaddockId, fromPaddockNameSnapshot | Local da origem naquele momento, ou null |
| toLotId, toLotNameSnapshot | Destino/inicial no cadastro, ou null |
| toPaddockId, toPaddockNameSnapshot | Local do destino naquele momento, ou null |
| fromStatus, toStatus | Transicao active/archived em status_changed; caso contrario null |
| notes | Obrigatorio e nao vazio para note; null quando nao aplicavel |
| createdAt, updatedAt | Timestamps ISO; createdAt preservado na edicao de note |

`registered`: somente animais criados nesta versao. Snapshot de lote/pasto inicial.
Animais V4 nao recebem registered retroativo.

`lot_changed`: estado anterior/destino capturados por ID e nome na transacao;
A -> null e null -> B validos; A -> A nao gera evento.

`status_changed`: active -> archived ou archived -> active; repetir o mesmo
estado nao gera evento. Arquivado permanece conceito administrativo.

`note`: observacao e data/hora editaveis. Identidade, contexto e type nao mudam.
Nenhuma exclusao de evento e exposta. Eventos automaticos sao imutaveis na API.

## Estado e Historico Atomicos

Cadastro/mudanca de lote/arquivo/reativacao usam uma unica transacao readwrite
com `animals` + `animal-events` e stores de contexto/referencias. Falha de
qualquer escrita aborta tudo. Criacao usa add, nunca sobrescreve colisao de ID.
`updateAnimal` recusa lotId diferente; usar `changeAnimalLot` (alias changeLot
mantido). UI de edicao cadastral nao permite mudar lote silenciosamente.

Alteracoes de tag/nome/sexo/categoria/raca/nascimento/notes nao geram ruido na
timeline. Mover lote entre pastos nao gera eventos em massa nos animais.
Nao ha transferencia entre propriedades ou exclusao definitiva do animal.

## Draft e WeighingItem

Draft schema 2 aditivo, continuando a ler schemas 1/2. Cada linha aceita
`animalId` opcional, default null. O ID da linha continua separado do ID do
animal cadastrado. Brinco textual e preservado independentemente do vinculo.
Nenhum reload infere identidade por tag. IDs incompativeis com conta/propriedade/
lote/estado ativo sao limpos na UI, sem remover peso/tag/categoria/observacao.

WeighingItem conserva todos os campos V4 e acrescenta snapshots:

- `animalId`: ID selecionado explicitamente, ou null.
- `animalTagSnapshot`: brinco do cadastro na finalizacao, ou null sem vinculo.
- `animalNameSnapshot`: nome do cadastro na finalizacao, ou null sem vinculo.
- `tagSnapshot`: continua o texto informado na pesagem, independente do cadastro.

Na mesma transacao que grava sessao/itens, a finalizacao revalida animal
existente/ativo, conta, propriedade ativa e lote da sessao quando selecionado.
Tambem consulta o cadastro atual para obter snapshots. Nao confia nos nomes
enviados pela UI. Mesmo animalId em dois itens bloqueia a sessao inteira.
Itens sem animalId permanecem permitidos; pesagens antigas nao recebem vinculo.

## Fontes de Verdade

Peso pertence a `weighing-items`, associado a `weighing-sessions`. Nao existe
evento persistido type=weighing e nenhum peso e copiado para `animal-events`.
Timeline e resumo sao compostos em memoria por animal selecionado:

```text
AnimalEvent filtrado por animal/conta/propriedade
  + WeighingItem indexado por animalId
  + WeighingSession validada no mesmo contexto
  + marcos derivados do cadastro
```

Nascimento deriva de birthDate; editar a data muda o marco. Cadastro legado
deriva de createdAt somente se registered nao existir, marcado como derivado
na apresentacao. Nao ha escrita de marcos derivados.

Ordenacao: occurredAt decrescente, createdAt decrescente e ID como desempate.
Pesagens existentes possuem dia, nao hora do ato: usam weighingDate como dia
cronologico (normalizado a 00:00Z somente para comparacao), exibindo data sem
inventar horario; empate usa createdAt/ID. Se data estiver ausente, createdAt
e fallback. Ultimo peso e o primeiro item dessa ordenacao, com contagem derivada.
`lastWeight`, contagem e timeline nao sao persistidos no Animal.

## Isolamento, Exclusao de Sessao e Limites

Repositories exigem accountId + propertyId + animalId e verificam referencias.
Pesagens entram na ficha apenas se sua sessao pertence ao mesmo contexto.
Animal arquivado conserva acesso ao historico, mas nao e opcao de nova pesagem.
Excluir uma sessao pelo fluxo historico existente remove seus itens; por ser
derivada, a timeline deixa de exibir essas pesagens, sem eventos duplicados orfaos.

Dados sao locais, sem login/nuvem/backup. O isolamento e logico entre contas,
nao autenticacao contra quem controla o perfil do navegador. Falhas de upgrade
sao transacionais; nao ha downgrade destrutivo nem limpeza automatica.
