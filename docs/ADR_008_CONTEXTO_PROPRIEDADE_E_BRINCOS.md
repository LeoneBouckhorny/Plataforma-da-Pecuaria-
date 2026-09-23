# ADR 008 - Contexto de Propriedade e Brincos

## Status

Implementado conforme ordem da Sprint 008; aguardando auditoria do CTO.
Branch: feature/sprint-008-property-context-tags. Base: 19d825e.

## Contexto de Gestao

Propriedades abre um detalhe por UUID real, com Visao geral, Rebanho e Pesagens.
O acesso global Rebanho foi removido porque os mesmos CRUDs e a ficha agora estao
no contexto da fazenda. Nenhum cadastro, evento ou historico foi removido.
Premium foi preservado como entrada preexistente, sem novos modulos ficticios.

managementPropertyId e separado de selectedPropertyId/selectedLotId da calculadora.
Abrir propriedades nao escreve draft nem muda animalId dos itens. O controlador
de rebanho recebe o ID explicitamente e descarta respostas de carregamentos antigos.
Os contadores usam repositories e nao sao persistidos. Leituras falhas exibem
Indisponivel, nao um zero que poderia parecer um resultado real.

Pesagens reutiliza o mesmo painel e repository do Historico; nao existe uma
segunda lista persistida. A lista contextual filtra session.propertyId por ID,
mantendo filtro de lote, detalhe, CSV, impressao e exclusao. Ao sair para o menu
global, o painel volta ao seu local e restaura o filtro global. Carregamentos de
detalhe validam a selecao e descartam respostas de uma navegacao anterior.

## Identidade e Origem

Animal.id continua UUID. tag e identificacao visual, nunca primary key ou vinculo.
O padrao V1 concatena tagNumber (quatro digitos de 0001 a 9999) e tagSuffix (A-Z).
tagOriginLotId registra o lote que emitiu o codigo. lotId informa o lote atual.
Mover 0023A para outro lote ou para nenhum lote nao altera nenhum dos campos de
identificacao; a movimentacao continua gerando o evento da Sprint 007.

Correcao de numero e permitida, mantendo UUID, suffix e origem e revalidando
unicidade. UI e repository nao permitem informar origem/sufixo livremente.
Snapshots de pesagem nao sao regravados. A correcao cadastral segue a Sprint 007:
nao cria um novo tipo de evento administrativo nesta entrega.

## Unicidade e Atomicidade

tagSuffix e unico por propriedade, case-insensitive, incluindo lotes arquivados.
Codigo arquivado permanece reservado. Um suffix pode ser corrigido antes da
emissao; depois, qualquer animal com tagOriginLotId correspondente bloqueia a
alteracao, mesmo arquivado, sem lote ou movido para outro lote.

tag completo e comparado com trim/uppercase, incluindo tags legadas e animais
arquivados. 0023A e 0023B sao distintos; propriedades distintas podem repetir.
Novas emissoes e alteracoes de identificacao nao podem introduzir duplicidade.
Duplicados preexistentes nao sao corrigidos automaticamente nem impedem editar
nome, mover ou arquivar o legado sem trocar sua identificacao.

Verificacao e escrita compartilham a transacao readwrite existente de
HerdRepository, incluindo lots e animals. Criacao/movimento/status de animal
incluem animal-events atomicamente. Transacoes sobre essas stores se serializam
mesmo entre conexoes, evitando check-then-write em transacoes separadas.
Usamos o indice propertyId existente para consultar o escopo antes da gravacao.
Nao foi necessario novo indice, DB_VERSION ou pausa arquitetural.

## Legado e Pesagem

Leituras toleram campos ausentes, com null normalizado apenas em memoria.
Nao existe migration nem regravacao em massa. Lote antigo pode receber suffix
explicitamente; isso nao converte seus animais. Brincos 101, 184 e BR-22 continuam
legiveis/editaveis como identificacao anterior. Converter brinco legado para
padrao fica no backlog; animal sem brinco pode continuar sendo cadastrado por nome.

Pesagem textual 0023A continua com animalId null. O produtor deve selecionar
explicitamente o animal. Finalizacao usa os repositories existentes para gravar
animalTagSnapshot e manter a origem historica, sem duplicar eventos de peso.

## PWA e Consequencias

DB_VERSION = 5, sem novas stores/indices. Cache v6 inclui tag-code-core.js.
Politicas de navegacao e assets, ativacao natural e branding foram preservados.
Sem skipWaiting, CDN, backend, sincronizacao ou nova dependencia.

Limites: 26 suffixes por propriedade; consultas de unicidade percorrem os registros
do escopo ja obtidos por propertyId. Escala e expansao de codigos precisam de
medicao e aprovacao propria. Persistencia local continua sem backup remoto.
QA desktop offline executado; Android fisico depende da homologacao do CEO.
