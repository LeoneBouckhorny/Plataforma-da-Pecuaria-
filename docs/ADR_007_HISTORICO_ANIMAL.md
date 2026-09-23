# ADR 007 - Historico Individual do Animal

## Status

Implementado conforme ordem da Sprint 007; aguardando auditoria do CTO.

## Fontes de Verdade e Identidade

A timeline combina eventos administrativos/notes com itens de pesagem por
animalId. Peso continua somente em weighing-items; duplicar em animal-events
exigiria duas atualizacoes/exclusoes e abriria divergencia. Timeline, contagem e
ultimo peso sao derivados. A ficha carrega somente o animal selecionado.

Tag e texto de identificacao, nao entidade. A associacao exige selecao explicita
na calculadora, seguida de revalidacao transacional de existencia, estado e
contexto. Coincidencia de brinco nunca cria vinculo em migration, draft ou
finalizacao. Vinculacao retroativa de pesagens antigas ficou no backlog.

## Eventos e Atomicidade

Enum fechado: registered, lot_changed, status_changed, note. Os tres primeiros
sao automaticos, sem edicao/exclusao manual. Apenas note admite edicao de texto
e data/hora. Mudancas cadastrais nao geram eventos nesta versao.

Estado e evento sao gravados na mesma transacao. As verificacoes e snapshots
usam os lotes/pastos dessa transacao; qualquer erro aborta ambos. updateAnimal
recusa alteracao de lotId e a UI usa changeAnimalLot para movimentar.
Repetir lote/status nao cria fatos falsos.

Snapshots preservam nomes e locais da origem/destino no momento da mudanca.
Nos itens de pesagem, snapshots de tag/nome sao lidos do cadastro no momento
da finalizacao; tagSnapshot continua refletindo o texto digitado na pesagem.

## Legado e Marcos Derivados

Migration V4 -> V5 acrescenta uma store e um indice na store de itens existente.
Nao reescreve registros, nao infere animalId e nao inventa registered para
cadastros antigos. Nascimento deriva de birthDate; registro legado pode ser
exibido de createdAt como informacao derivada explicitamente identificada.

Pesagens nao possuem horario do ato na modelagem existente. A ordenacao usa
o dia informado e createdAt/ID como desempate, sem exibir um horario ficticio.
Eventos possuem timestamp ISO com fuso, exibido no horario local do aparelho.

## Escopo e Evolucao

Local atual permanece Animal -> Lot -> Paddock, sem duplicacao no Animal.
Mover um lote de pasto nao gera milhares de eventos individuais. Historico de
ocupacao/movimentacao de lotes precisa de modelagem propria em sprint posterior.

Compra, venda, morte, abate e nascimento formal exigem regras de ciclo de vida,
nao podem ser representados por arquivamento. Sanidade/reproducao poderao usar
a infraestrutura de eventos com tipos/regras aprovados futuramente, sem criar
um segundo historico paralelo. Nada disso foi implementado nesta entrega.

## PWA e UI

Cache v5 inclui os cinco modulos novos, mantendo branding, estrategias de
navegacao/estaticos e ativacao natural, sem skipWaiting ou bibliotecas novas.
Ficha em dialog com rolagem interna; linhas simples na timeline, tokens V1,
formulario de note e mudanca de lote. Conteudo do produtor usa DOM seguro.

## Consequencias e Limites

Leituras de ficha sao locais e indexadas por animalId. Nao renderizamos detalhes
de todo rebanho simultaneamente. Ainda e necessario medir grandes volumes antes
de paginar/virtualizar. Exclusao de sessao existente remove o peso derivado da
ficha. Backup, auditoria de exclusao e sincronizacao continuam fora do escopo.
