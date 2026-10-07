# ADR 006 - Estrutura do Rebanho

## Status

Implementado conforme ordem da Sprint 006; aguardando auditoria do CTO.

## Decisao

Separar propriedade (unidade da operacao), pasto/piquete (local fisico), lote
(agrupamento de manejo) e animal (individuo). O lote guarda `paddockId` atual;
o animal guarda apenas `lotId`. Duplicar `paddockId` no animal criaria duas
fontes de verdade e exigiria regravar todos os animais ao mover um lote.

IDs sao autoridade; nomes e brincos sao dados de exibicao. Nao relacionar
cadastros por texto, inclusive antigos pastos temporarios e itens de pesagem.
Identificadores sao imutaveis e usam a estrategia local existente.

## Organizacao

Tres cores puros e tres repositories com APIs tipadas. `herd-core.js` compartilha
normalizacao da identidade/ciclo de vida; `herd-repository.js` concentra as
verificacoes identicas de contexto, referencia e arquivamento. Nao e framework
generico nem altera a arquitetura dos repositories anteriores.
`herd-controller.js` isola o DOM/formularios da nova area. Reutiliza os tokens,
componentes e icones locais do Design System V1.

## Transacoes e Arquivamento

Uma transacao readwrite abrangendo conta/propriedade e as tres stores novas
serializa atribuicao e arquivamento concorrentes. Pasto com lote ativo e lote
com animal ativo recusam arquivamento. Nao ha delete definitivo.
Filho ativo exige pai ativo; reativacao exige reativar o pai ou desvincular o
filho antes. Propriedade arquivada exige reativacao antes de editar seu rebanho.
Arquivado e somente organizacao local, nao evento de venda/morte/abate.

`LocalDatabase.writeTransaction` agora aborta quando o callback falha e observa
a rejeicao da transacao, evitando gravacao parcial e rejeicao nao tratada.

## Pesagem e Historico

Vinculo ao lote e opcional. Pesagem livre continua independente do cadastro.
Draft schemas 1/2 recebem defaults aditivos; nao e necessario elevar schema.
Na gravacao de historico vinculado, a mesma transacao valida propriedade/lote,
le pasto e captura nomes/localizacao junto com sessao/itens. Renomear/mover depois
nao atualiza o passado. Nao ha associacao individual por brinco.

Contadores de animais cadastrados sao derivados, nunca `animalCount` persistido.
Nao equivalem automaticamente a todas as cabecas fisicas presentes no lote.

## Migration e PWA

Banco V3 -> V4: apenas tres stores novas, com indices accountId/propertyId/status.
As seis stores anteriores nao sao recriadas nem tem dados reescritos.
Cache v3 -> v4 inclui os nove modulos novos. Estrategias de navegacao/estaticos,
ativacao natural e limpeza seletiva permanecem; sem skipWaiting ou dependencias.

## Fora do Escopo

Movimentacao historica e transferencia entre propriedades exigem eventos formais,
regras de origem/destino e recuperacao. Nesta entrega somente o estado atual
muda; `propertyId` e imutavel. IDs e snapshots estaveis preparam um futuro
historico de eventos sem implementar tabelas/eventos especulativos agora.
Sem historico individual, sanidade, reproducao, financeiro, backend ou nuvem.

## Consequencias

Locks abrangem as stores de rebanho para favorecer integridade. Leituras e
contadores usam dados locais filtrados; sem paginacao nesta escala inicial.
Persistencia local e isolamento logico nao representam autenticacao ou backup.
