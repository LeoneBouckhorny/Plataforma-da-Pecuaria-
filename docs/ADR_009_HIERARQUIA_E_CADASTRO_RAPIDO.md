# ADR 009 - Hierarquia e cadastro rapido opcional

Status: implementado para auditoria do CTO; aprovacao pendente.
Base: Sprint 008, commit 4e55c2d. IndexedDB V5 preservado.

## Contexto

A lista plana dificultava reconhecer a localizacao dos animais. O primeiro
cadastro de uma fazenda exigia muitas operacoes individuais. A ordem autoriza
navegacao hierarquica e geracao opcional apenas na criacao de um novo lote.

## Decisoes

- `herd-hierarchy-core.js` deriva a arvore filtrando accountId e propertyId.
  Animal continua tendo somente lotId; localizacao fisica vem do paddockId do lote.
  Lotes sem pasto e animais sem lote possuem acesso explicito. Registros arquivados
  continuam acessiveis; contadores de resumo consideram ativos.
- O estado de navegacao fica no controller, nao em IndexedDB nem no draft global.
  Abrir propriedade redefine a navegacao; mutacoes recarregam a arvore atual.
- Lot.categories e Lot.breeds sao arrays sem strings vazias ou duplicadas
  (comparacao sem distincao de caixa). Categories presente, inclusive vazio,
  prevalece sobre category legado. Ler legado nao regrava dados. Ao salvar
  explicitamente, o lote adota somente categories como autoridade.
- `fast-lot-registration-core.js` calcula um plano puro usando TagCodeCore e
  LotCore. Nao possui DOM, IO ou IDs persistidos. Machos precedem femeas na
  sequencia; nao ha significado zootecnico nessa ordem.
- `fast-lot-registration-repository.js` expoe createLotWithAnimals e reutiliza
  a infraestrutura do HerdRepository. A acao interna createFast existe somente
  para lote novo, sem id existente. Create/update normais nao geram animais.
- Uma transacao readwrite inclui accounts, properties, paddocks, lots, animals
  e animal-events. As tres primeiras participam da validacao de vinculos; somente
  as tres ultimas recebem os novos registros. Verificacao de escopo, atividade,
  sufixo, tags e construcao/validacao de todos os individuos e eventos antecedem
  o primeiro add. Qualquer falha de escrita aborta o conjunto inteiro.
- A verificacao do intervalo consulta animais da propriedade, incluindo
  arquivados e tags legadas normalizadas. Transacoes com stores sobrepostas sao
  serializadas pelo IndexedDB; a segunda conexao revalida depois da primeira.
  A UI nao e autoridade de unicidade.
- Cada individuo e evento utiliza o gerador de UUID existente. Um registered
  por animal preserva snapshots de lote/pasto de origem. Nao ha nomes artificiais.
- Contagens de formulario nao entram no lote. Categoria/raca individual so e
  copiada quando o array correspondente contem exatamente um valor.
- Confirmacao para todo plano rapido valido, nao apenas lotes grandes. Cancelar
  preserva os campos sem escrever. Enquanto salva, a acao nao pode ser repetida.
- Cache v7 inclui os tres modulos novos, mantendo politicas do SW e sem skipWaiting.
  DB_VERSION=5, nenhuma migration, store ou indice novo.

## Consequencias e verificacao

A atomicidade evita cadastro parcial, mas requer manter plano e registros em
memoria durante a operacao. Nao houve chunking nem limite pequeno adicional:
vale o intervalo aprovado 1..9999. A geracao pura de 9999 foi testada; persistencia
e renderizacao foram medidas com 100, nao com 9999. Isso nao promete desempenho
em Android de entrada. Ver QA_SPRINT_009.md e evidence.json.

Mantidos eventos e vinculo explicito na pesagem. A mudanca de pasto de um lote
continua sendo estado atual, sem introduzir novo tipo de evento nesta Sprint.
Nao foram implementados importacao, edicao em massa, transferencia ou nuvem.
Nao houve pausa arquitetural.
