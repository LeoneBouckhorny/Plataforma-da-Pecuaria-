# ADR 011 - Reproducao V1

Status: implementado para auditoria do CTO. Base 1bd9bfe, branch
`feature/sprint-011-reproducao-v1`.

## Persistencia e integridade

Reutilizar animal-events com type=reproduction e cinco reproductionTypes:
estrus, natural_service, artificial_insemination, pregnancy_diagnosis e calving.
DB_VERSION permanece 5. Nenhuma store, indice, migration ou dependencia nova.
Eventos anteriores nao sao convertidos nem regravados.

ReproductionRepository recebe accountId, propertyId e animalId explicitos.
Uma unica transacao readwrite consulta accounts, properties, animals, lots e
paddocks, valida referencias e grava somente um evento por add. Falhas abortam
a escrita; colisao de ID nao sobrescreve historico. Identidade, timestamps de
criacao e snapshots nao sao aceitos da UI. Nenhum campo de Animal e alterado.

## Regras

Todos os tipos exigem occurredAt explicito. Matriz ativa, da mesma conta e
propriedade ativa, deve ser female ou unknown. Unknown apresenta aviso antes do
registro e permite salvar sem modificar sexo; o repository retorna warning.
Male e bloqueado na UI e na transacao para eventos de matriz.

Cobertura permite sireAnimalId explicitamente selecionado OU externalSire
textual. Identificacao e opcional: a ordem permite informar sem exigir cadastro.
As duas formas simultaneas sao recusadas. O cadastrado deve existir, ser macho
ativo e pertencer a mesma conta/propriedade. Nomes/brincos externos nunca geram
vinculos. Inseminacao usa identificacao textual opcional do doador, semenBatch
e technician, sem catalogo ou inferencia de pedigree.

Diagnostico exige result: pregnant, not_pregnant ou inconclusive. Parto exige
calfCount inteiro seguro >=1; maleCalves/femaleCalves opcionais, inteiros seguros
>=0, com soma <= calfCount. Ausencia continua null, nao zero inferido. Parto nao
cria animais. O repository so copia os campos aplicaveis ao tipo selecionado.

## Snapshots e consulta

SireAnimalId, sireNameSnapshot e sireTagSnapshot sao capturados na transacao.
Renomeacao/arquivamento posterior nao modifica o evento. Contexto capturado:
lotId/lotNameSnapshot e paddockId/paddockNameSnapshot, ou null. Mesmo para data
passada, e o contexto atual no registro, sem inferir localizacao retroativa.
Identificacao visivel da matriz usa seu cadastro atual por animalId, seguindo
Sanidade; o vinculo nunca depende do texto.

Resumo da ficha deriva ultimo diagnostico, ultima cobertura/inseminacao e ultimo
parto por occurredAt decrescente, createdAt e ID como desempate. Sem eventos,
exibe Sem registro. Nao existe animal.reproductiveStatus. Ultimo diagnostico nao
equivale ao estado clinico atual e nao e apagado automaticamente por um parto.
Arquivados mantem historico, sem participar de novas selecoes.

Consulta usa indice propertyId existente, revalida accountId e filtra em memoria
por tipo, resultado, lote snapshot e periodo local inclusivo. Resultado fica
habilitado apenas ao filtrar diagnostico. Nenhuma lista duplicada e persistida.
Edicao/exclusao reprodutiva nao esta autorizada nesta V1; updateNoteEvent segue
restrito a note.

## Interface e offline

Formulario individual compartilhado entre propriedade e ficha. Campos ocultos
sao desabilitados/limpos ao trocar de tipo ou reprodutor. Erros junto dos campos;
falha conserva entradas; envio duplicado e fechamento durante escrita bloqueados.
DOM seguro, componentes e tokens existentes. App shell v9 inclui os dois novos
modulos, preservando ativacao natural, limpeza seletiva e politicas anteriores,
sem skipWaiting. QA offline com servidor desligado registrado no QA_SPRINT_011.

Sem calendario, previsao/recomendacao, indicadores, coletivo reprodutivo,
estoque, genealogia ou criacao automatica de animais. Escala requer medicao
antes de novos indices/paginacao. Sem pausa arquitetural. Android fisico pendente.
