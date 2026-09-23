# ADR 010 - Sanidade V1

Status: implementado para auditoria do CTO. Base f268996, Sprint 009 aprovada.

## Decisao

Reutilizar `animal-events` com type=health e quatro healthTypes: vaccination,
deworming, medication e other. DB_VERSION permanece 5; nenhum indice, store ou
migration novo. Eventos anteriores e suas regras permanecem validos.

HealthRepository expoe registro individual/coletivo por animalIds explicitos.
Uma transacao readwrite consulta accounts, properties, animals, lots e paddocks
e grava somente animal-events. Revalida escopo, propriedade ativa e animais
ativos; a selecao de lote tambem exige que cada individuo continue naquele lote.
Todos os destinatarios e eventos sao validados antes da primeira escrita.
Falha em qualquer add aborta a operacao inteira, sem dados parciais.

Cada chamada bem-sucedida cria um UUID operationId, compartilhado pelos eventos
da operacao, e um UUID independente por evento. O chamador nao fornece identidade,
operationId ou snapshots: eles sao gerados/capturados dentro do repository.
Uma chamada individual segue a mesma regra. operationId nao e chave de
idempotencia nem registro duplicado de operacao; nao existe nova store.

O contexto sanitário e fotografado no momento do registro: lotId,
lotNameSnapshot, paddockId e paddockNameSnapshot, ou null sem vinculo.
Esses campos pertencem ao evento, nao ao Animal. Mesmo para ocorridoAt passado,
nao se infere localizacao historica retroativa. Renomear/mover cadastros nao muda
os snapshots ja gravados. Identificacao visivel do animal usa o cadastro atual
por animalId, nunca associacao por tag.

## Campos e validacao

AnimalEventCore normaliza campos health somente em type=health e exige healthType
conhecido e occurredAt explicito/valido. Produto e obrigatorio para os tres tipos
de aplicacao; other exige notes descritivo. Dose e opcional: quando informada,
deve ser positiva, decimal com virgula ou ponto, acompanhada de unidade livre.
Nao se recomenda nem calcula dose. nextDueDate e withdrawalUntil aceitam datas
validas opcionais, apenas informadas pelo produtor, sem agenda ou calculo.

Health V1 nao expoe edicao/exclusao: eventos sanitarios nao podem passar pelo
updateNoteEvent existente. Correcao/cancelamento auditavel e uma decisao futura,
nao implementada por inferencia. Campos persistidos no MODELO_DE_DADOS_V5.md.

## Interface e consulta

Um formulario compartilhado atende Sanidade da propriedade, lote e ficha.
Lista somente animais ativos; todos podem iniciar selecionados, com desmarcacao
individual e contagem visivel. Duplo envio e fechamento durante escrita sao
bloqueados. Falha preserva campos e informa que nada foi salvo.

Sanidade deriva registros de animal-events por propertyId e revalida accountId.
Filtros locais: tipo, lotId do snapshot e periodo inclusivo no horario local.
Sem duplicar lista persistida. Ficha individual incorpora os mesmos eventos
na timeline existente; animais arquivados preservam consulta, sem novo manejo.
Conteudo do produtor usa APIs seguras do DOM e componentes/tokens existentes.

App shell v8 inclui health-repository e health-controller; estrategias existentes
e ativacao natural preservadas, sem skipWaiting. Nenhuma dependencia/API externa.

## Limites

Consultas usam o indice propertyId existente e filtragem em memoria. Nao foram
antecipados indices, paginacao ou processamento em blocos que romperia atomicidade.
Nao houve pausa arquitetural. QA comprova rollback no evento18/30 e operacao
offline; Android fisico e volumes maiores permanecem por homologar.
