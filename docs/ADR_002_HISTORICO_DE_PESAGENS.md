# ADR 002 - Historico Local de Pesagens

## Status

Aceita para a Sprint 002.

## Contexto

A Sprint 001 preservou apenas o rascunho da pesagem atual. A Sprint 002 precisava transformar uma pesagem valida em registro historico local, mantendo a aplicacao local-first e sem introduzir autenticacao, sincronizacao ou banco remoto.

O ponto critico era impedir que uma edicao futura do rascunho alterasse uma pesagem ja finalizada.

## Decisao

Adicionar historico local em IndexedDB V2 usando duas novas stores:

- `weighing-sessions`;
- `weighing-items`.

Cada finalizacao cria um snapshot imutavel:

- a sessao guarda parametros, identificacao e totais calculados;
- os itens guardam brinco, categoria, peso, faixa e arrobas no momento da finalizacao.

O salvamento da sessao e dos itens acontece em uma unica transacao `readwrite`. A exclusao tambem ocorre em uma unica transacao, removendo a sessao e todos os itens pelo indice `sessionId`.

O draft continua separado em `drafts` enquanto a pesagem esta em andamento.

Apos `saveCompletedSession(snapshot)` confirmar que a sessao historica foi salva, o draft persistido correspondente (`calculator-current`) deve ser removido pelo `DraftRepository`. Essa remocao ocorre somente depois da confirmacao do historico, nunca antes.

Antes dessa remocao, qualquer autosave pendente da mesma pesagem e cancelado e a referencia do timer e limpa. Esse cancelamento nao ocorre antes da confirmacao historica; se a gravacao do historico falhar, o fluxo de rascunho continua ativo para proteger os dados em andamento.

A tela pode permanecer visivel apos a finalizacao para que o produtor confira o romaneio. Enquanto os dados exibidos forem a mesma pesagem ja finalizada, o botao `Finalizar pesagem` fica bloqueado no runtime. Se o usuario editar qualquer dado depois disso, a tela passa a representar um novo rascunho, o estado visual de pesagem finalizada e limpo e o autosave pode criar um novo `calculator-current`.

Essa decisao reduz a chance de duplicacao historica apos reload, porque uma pesagem finalizada com sucesso nao reaparece como rascunho persistido.

## Consequencias

Beneficios:

- historico nao muda quando o rascunho e alterado;
- reload apos finalizacao nao oferece novamente o mesmo draft para finalizar;
- reducao de risco de itens orfaos;
- base preparada para relatorios e sincronizacao futura;
- CSV e romaneio podem usar snapshots, nao dados volateis da tela.

Custos:

- aumento de complexidade no IndexedDB;
- necessidade de migracao V1 para V2;
- necessidade de testes separados para snapshot, repositorio e exportacao.

## Regras

- Dados demo nao podem ser finalizados.
- Parametros invalidos bloqueiam finalizacao.
- Animais invalidos bloqueiam finalizacao.
- Animal sem brinco e permitido e exibido como `Sem brinco`.
- Brinco duplicado na mesma sessao bloqueia finalizacao.
- O historico da Sprint 002 e local ao dispositivo.
- Carregar demonstracao nao pode excluir, substituir ou modificar o ultimo draft real persistido.
- Se a sessao historica for salva e a remocao do draft falhar, o historico deve ser mantido e o usuario deve receber aviso nao bloqueante.

## Alternativas Consideradas

### Salvar apenas o draft como historico

Rejeitada. Misturaria dados editaveis com registro finalizado e criaria risco de alteracao retroativa do romaneio.

### Salvar sessao e itens dentro do mesmo objeto

Rejeitada nesta sprint. Facilitaria a primeira gravacao, mas dificultaria consultas futuras por animal, relatorios e exclusao parcial/analitica.

### Implementar sincronizacao junto com o historico

Rejeitada por escopo. Sincronizacao depende de conta, autentificacao, resolucao de conflitos e politica de exclusao.

## Impacto Futuro

Quando houver login e multi-dispositivo, sera necessario:

- preencher `accountId` e `propertyId`;
- avaliar tombstones ou soft delete;
- definir resolucao de conflitos;
- migrar snapshots locais para dados sincronizados;
- manter compatibilidade com sessoes antigas.
