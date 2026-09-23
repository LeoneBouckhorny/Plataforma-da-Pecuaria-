# Relatorio da Sprint 007

## Resumo e Branch

Historico individual implementado com ficha, timeline, observacoes datadas,
mudancas de lote e status atomicas, pesagens explicitamente vinculadas e ultimo
peso derivado. Entrega para auditoria, sem declarar aprovacao pelo CTO.

Branch: `feature/sprint-007-animal-history`, baseada em `1682473` (Sprint 006).
Arvore estava limpa ao iniciar; a branch foi criada pelo usuario, nao pelo Codex.

## Arquivos

Inventario completo, incluindo screenshots/logs: `SPRINT_007_ARQUIVOS.txt`.

Criados em src:

- `animal-event-core.js`, `animal-event-repository.js`.
- `animal-history-core.js`, `animal-history-repository.js`.
- `animal-detail-controller.js`.

Testes criados: `animal-event-core.test.js`, `animal-event-repository.test.js`,
`animal-event-transactions.test.js`, `animal-history.test.js`,
`animal-history-pwa.test.js`. Scripts: `qa-sprint-007.cjs` e
`package-sprint-007.py`. Docs: modelo V5, ADR 007, QA 007, este relatorio e inventario.

Modificados: README, app.js, index.html, sw.js, styles/layout.css,
src/animal-repository.js, src/herd-controller.js, src/herd-repository.js,
src/local-data-core.js, src/local-database.js, src/weighing-history-core.js,
src/weighing-repository.js e docs/BACKLOG_PRODUTO.md.
Fixtures/testes anteriores atualizados: animal-repository, design-system,
herd-pwa, herd-test-helpers, local-database-migration e pwa-config.
Arquivos removidos: nenhum. Dependencias adicionadas ao aplicativo: nenhuma.

## Banco, Indices e Migration

DB_VERSION 5. Store nova `animal-events`, keyPath id; indices accountId,
propertyId, animalId, type, occurredAt. Novo indice animalId na store
weighing-items existente; sessionId permanece. Nove stores anteriores intactas.

Upgrade real V4 -> V5 executado sobre a versao aprovada 1682473 com todos os
tipos de registros populados. Comparacao profunda confirmou preservacao de
conta, propriedade, settings, rebanho, draft, sessoes e itens. Nenhum registered
retroativo e nenhum animalId inferido por tag. Migration nao recria itens.

## Eventos e Transacoes

- registered: novo animal e evento na mesma transacao, com lote/pasto inicial.
- lot_changed: operacao explicita changeAnimalLot; A -> B, A -> null e null -> B;
  mesmo lote nao gera evento. updateAnimal recusa mudar lotId silenciosamente.
- status_changed: arquivo/reativacao com estado e evento na mesma transacao;
  repeticao do mesmo status nao cria evento.
- note: texto e data/hora, edicao somente de note; sem exclusao de eventos.

Eventos de sistema nao editaveis. Snapshots guardam nomes/locais na origem e
destino; renomear depois nao altera historico. Falha de estado ou evento aborta
ambos. Oito falhas simuladas nos testes Node e repetidas no IndexedDB real.
Edicao cadastral nao gera eventos. Mover pasto do lote nao gera eventos em massa.

## Vinculo Individual e Snapshots

Cada linha da calculadora recebe seletor opcional de animal. Opcoes: animais
ativos da conta/propriedade; com lote escolhido, somente os atuais daquele lote.
Tag textual nao determina identidade, nem no reload ou migration.

Draft schema 2 aditivo aceita animalId sem rejeitar schemas 1/2. Trocar contexto
limpa somente vinculos incompativeis e preserva pesos/textos. Mesmo animalId em
duas linhas impede finalizacao, inclusive com tags diferentes.

Finalizacao revalida existencia/estado/conta/propriedade/lote e captura
animalTagSnapshot/animalNameSnapshot na mesma transacao historica. TagSnapshot
continua o texto digitado. Renomeacoes futuras nao mudam snapshots.
Pesagens antigas permanecem sem vinculo; backfill manual ficou no backlog.

## Ficha e Timeline

Ver ficha e uma acao explicita no card. Dados atuais, lote/local derivados,
ultimo peso, data e contagem precedem a timeline. Acoes de note, mudar lote e
arquivo/reativacao usam as APIs protegidas. Nao ha tabela larga na ficha.

Timeline combina animal-events com weighing-items e suas sessoes; peso nao e
copiado para animal-events. Nascimento deriva de birthDate; cadastro legado
deriva de createdAt quando registered nao existe, identificado como derivado.
Ordenacao por data decrescente, com createdAt/ID para desempate. Pesagens usam
o dia informado, sem exibir hora ficticia. Ultimo peso/contagem nao sao persistidos.
A ficha carrega dados apenas do animal selecionado, nao de todo o rebanho.

## Isolamento e Offline

Leituras/escritas de eventos exigem conta, propriedade e animal. Notas forjadas
de outro contexto sao recusadas. Ficha valida tambem o contexto da sessao de
pesagem. QA com animais 101 homonimos na Boa Vista e Sao Romao nao misturou dados.
Animal arquivado conserva ficha e pesagens antigas, mas nao e opcao de nova pesagem.

Cache `plataforma-pecuaria-shell-v5` inclui cinco modulos novos. Branding V1,
estrategias anteriores, limpeza seletiva e ativacao natural preservados.
Sem skipWaiting, CDN, backend, autenticacao ou sincronizacao.

QA offline real no navegador: rede desativada e servidor HTTP encerrado ->
ficha -> note -> mudar lote -> pesagem vinculada -> finalizar -> fechar pagina ->
reabrir offline -> nota, mudanca, peso 490 kg e timeline persistidos.
Evidencia detalhada em `qa-sprint-007/evidence.json`.

## Testes e QA

```text
tests 174
pass 174
fail 0
skipped 0
cancelled 0
```

138 anteriores preservados; 36 novos. Nenhum teste removido/enfraquecido.
Expectativas de versao, indices e store transacional foram adaptadas ao novo
modelo aditivo. TAP integral em `qa-sprint-007/tests.txt`; sintaxe em
`qa-sprint-007/syntax.txt`.

QA navegador aprovado nesta execucao: migration populada, cache update, ficha,
note/reload/edicao, movimento/snapshot, cadastro novo, selecao explicita,
nao inferencia por tag, duplicidade, ultimo peso, arquivo/reativacao, isolamento,
troca de contexto, DOM seguro, oito rollbacks reais e ciclo offline.
Nenhum erro JavaScript capturado. Evidencias por cenario em `QA_SPRINT_007.md`.

360x800, 768x1024, 1280x900: lista, ficha, timeline, note, mudanca de lote,
calculadora e historico sem overflow global. Screenshots incluidos no ZIP.

## Execucao e Auditoria

```powershell
node scripts/serve.cjs
# http://127.0.0.1:8026/index.html
node --test tests/*.test.js
node scripts/qa-sprint-007.cjs
```

O QA exige Playwright no ambiente de desenvolvimento. QA_BROWSER_PATH e opcional.
PWA em producao exige HTTPS. Clientes antigos devem ser fechados para ativacao
natural do service worker novo. Nao limpar armazenamento para atualizar.

- `docs/SPRINT_007_ENTREGA.diff`: diff completo com novos arquivos e binarios.
- `sprint_007_entrega.zip`: projeto completo, caminhos ZIP portaveis `/` e CRC.
- Esses dois artefatos nao devem entrar no futuro commit.

## Limitacoes e Problemas Conhecidos

- Android fisico/teclado virtual e instalacao real nao foram homologados aqui.
- Grande volume de rebanho/timeline ainda exige medicao; sem paginacao complexa.
- Dados continuam locais, sujeitos a limpeza do armazenamento; sem backup remoto.
- Pesagens possuem data do ato, nao hora; desempate usa createdAt/ID.
- Exclusao de sessao pelo fluxo existente remove seus pesos derivados da ficha.
- Sem GMD/graficos, compra/venda/morte, sanidade/reproducao ou historico do lote
  entre pastos. Esses itens nao sao falhas de entrega, estao fora do escopo.
- Nenhum defeito bloqueante identificado nos testes executados. A aprovacao
  tecnica e a homologacao final permanecem com CTO/CEO.

## Sugestoes Separadas, Nao Implementadas

| Problema | Proposta | Beneficio | Riscos | Prazo | Impacto arquitetural/modulos |
| --- | --- | --- | --- | --- | --- |
| Timeline longa | Medir volume real antes de definir paginacao | Evitar custo desnecessario sem perder responsividade | Otimizacao prematura pode complicar ordenacao | Medicao curta; implementacao depende de escopo | animal-history-repository/controller; indices novos somente com autorizacao |
| Exclusao/limpeza de dados locais | Definir backup e regras de recuperacao/auditoria | Recuperar historico do produtor | Importacao pode violar integridade se incompleta | Sprint especifica a estimar | repositories, migration, export/import e ADR proprio |

Nenhuma sugestao acima foi aplicada automaticamente. Nenhuma pausa arquitetural
foi necessaria. Nenhuma funcionalidade da Sprint 008 iniciada.

## Confirmacoes

Nenhum git add, commit, push, merge, rebase, reset --hard, criacao/exclusao de
branch ou alteracao de remote executado nesta Sprint. Aguardar auditoria do CTO.
