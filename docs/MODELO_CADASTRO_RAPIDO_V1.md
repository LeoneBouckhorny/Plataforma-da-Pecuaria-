# Modelo de cadastro rapido V1

## Estrutura mantida

`Propriedade -> Pasto/Piquete -> Lote -> Animal`.
Lot.paddockId e Animal.lotId continuam opcionais. Animal nao possui paddockId.
accountId e propertyId delimitam todos os vinculos. UUID e identidade tecnica;
tag nao substitui UUID. Nao ha alteracao de schema do IndexedDB V5.

## Lote

Campos existentes: id, accountId, propertyId, name, tagSuffix, paddockId,
notes, status, createdAt, updatedAt. Nome e sufixo sao obrigatorios para novos
lotes. Sufixo e uma letra A-Z unica na propriedade, inclusive entre arquivados.

Novos campos no objeto:

| Campo | Tipo | Regra |
| --- | --- | --- |
| categories | string[] | Opcional; padrao []; trim, espacos compactados e deduplicacao sem distinguir caixa |
| breeds | string[] | Opcional; mesmas regras de normalizacao |

Quando categories nao e array, category legado e normalizado para zero ou uma
categoria. Quando categories ja e array, ele prevalece mesmo vazio. Nenhuma
reescrita ocorre na leitura; uma mutacao explicita salva o formato canonico sem
category duplicado. Lotes sem breeds recebem [] na apresentacao, sem inferencia.
Sugestoes nao sao enum fechado: produtor pode informar categoria e raca proprias.

Categorias sugeridas: Cria, Recria, Engorda, Bezerros, Bezerras, Garrotes,
Novilhas, Vacas, Matrizes, Reprodutoras, Touros, Reprodutores, Outra.
Racas sugeridas: Nelore, Brahman, Tabapua, Guzera, Sindi, Indubrasil, Angus,
Senepol, Mestico, Outra (rotulos da UI preservam acentuacao).

## Comando transitorio

`createLotWithAnimals(accountId, propertyId, data)` recebe campos do lote mais:

| Campo | Regra |
| --- | --- |
| maleCount | Inteiro >=0, obrigatorio no modo rapido |
| femaleCount | Inteiro >=0, obrigatorio no modo rapido |
| startNumber | Inteiro 1..9999, obrigatorio no modo rapido |

Total = maleCount + femaleCount, obrigatoriamente >0. Fim = inicio + total -1,
obrigatoriamente <=9999. Texto, negativos, decimais, vazio e numeros inseguros
sao rejeitados. Total nao e editavel. Esses campos nao sao persistidos no lote.
O cadastro normal ignora campos de geracao e cria apenas um lote; editar tambem
nao gera individuos. A opcao rapida aparece somente na criacao, desmarcada.

## Individuos e eventos

Para cada posicao no intervalo:

- id: UUID independente;
- accountId/propertyId: mesmo escopo do lote validado;
- lotId e tagOriginLotId: id do novo lote;
- tagNumber: quatro digitos; tagSuffix: sufixo do novo lote; tag: concatenacao;
- sex: male nas primeiras maleCount posicoes, female nas seguintes;
- category/breed: unico valor normalizado do array correspondente, ou string vazia;
- name: string vazia; status e timestamps seguem AnimalCore existente;
- um animal-event registered, com UUID proprio, animalId e snapshots de destino.

Exemplo: inicio 23, 2 machos e 2 femeas, sufixo A gera 0023A/0024A machos e
0025A/0026A femeas. Com varias racas/categorias, nenhum valor individual e sorteado.
Mover 0023A para B altera lotId, mas preserva tag, tagSuffix e tagOriginLotId.
Pesagem continua exigindo selecao explicita de animalId.

## Consistencia

Validacoes e gravacoes acontecem em uma unica transacao, incluindo verificacao
de TODO o intervalo contra tags ativas, arquivadas e legadas normalizadas.
Conflito retorna invalid, sem novos dados. Erro na escrita retorna failed e
aborta lote, animais e eventos. Campos da UI permanecem para nova tentativa.
Concorrencia usa a serializacao de readwrite do IndexedDB, sem trava apenas na UI.

Contadores sao derivados dos individuos ativos. Animais com sexo desconhecido
continuam contados no total e sao apresentados separadamente. Pastos somam
lotes ativos e seus animais ativos. Os contadores representam cadastros, nao
uma estimativa do rebanho fisico. Arquivados permanecem acessiveis.
