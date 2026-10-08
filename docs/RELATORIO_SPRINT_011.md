# Entrega Sprint 011 - Reproducao V1

Status: implementada, aguardando auditoria do CTO.
Branch: feature/sprint-011-reproducao-v1. Base: 1bd9bfe.

## Implementacao

- Propriedades -> propriedade escolhida -> Reproducao; registro tambem na ficha.
- Cinco tipos: cio, cobertura natural, inseminacao artificial, diagnostico e parto.
- animal-events/type=reproduction, IDs internos explicitos e occurredAt obrigatorio.
- Cobertura com macho ativo cadastrado da mesma conta/propriedade ou texto externo;
  inseminacao com doador, lote de semen e tecnico opcionais, sem catalogo/inferencia.
- Diagnostico estruturado: pregnant, not_pregnant, inconclusive.
- Parto: total inteiro >=1, machos/femeas opcionais com soma <=total, sem criar bezerros.
- Macho bloqueado como matriz; unknown permitido com aviso sem alterar sexo.
- Snapshots de touro/lote/pasto capturados na transacao; renomear nao altera passado.
- Timeline imediata; ultimo diagnostico/cobertura/parto derivados, sem estado duplicado.
- Consulta por propriedade com tipo, resultado, lote snapshot e periodo local.
- Transacao grava somente o evento; nenhum campo de Animal e alterado.
- Campos contextuais, DOM seguro, Design System existente e mobile-first.

## Arquivos

Criados: src/reproduction-repository.js, src/reproduction-controller.js;
tests/reproduction-core.test.js, reproduction-repository.test.js e reproduction-pwa.test.js;
scripts/qa-sprint-011.cjs e package-sprint-011.py;
docs/ADR_011_REPRODUCAO_V1.md, QA_SPRINT_011.md, este relatorio,
SPRINT_011_ARQUIVOS.txt e evidencias em docs/qa-sprint-011/.

Modificados: app.js, index.html, src/animal-event-core.js,
src/animal-history-core.js, src/animal-detail-controller.js, styles/layout.css,
sw.js; cinco testes existentes de PWA/design (expectativa v9);
README.md, docs/MODELO_DE_DADOS_V5.md e docs/BACKLOG_PRODUTO.md.
Nenhum arquivo removido. Inventario completo: SPRINT_011_ARQUIVOS.txt.

## Banco, cache e testes

DB_VERSION=5 preservado; nenhuma migration, store ou indice novo.
Cache v8.1 -> v9 com dois modulos locais; sem skipWaiting, backend ou dependencia.

Testes relacionados primeiro: 66/66 e 23/23. Suíte integral final: **309/309**,
sendo 280 anteriores +29 novos; zero falhas/skipped/cancelled. Sintaxe JavaScript
verificada. Saida integral e evidencias em docs/qa-sprint-011/.

QA real em Edge Chromium: upgrade preservou todas as stores; snapshots imutaveis;
bloqueios, filtros, erro de escrita, DOM seguro e timeline confirmados. Rede e
servidor desligados: reabriu, registrou os cinco tipos, fechou/reabriu e preservou
11 eventos na propriedade, 9 na ficha principal. Nenhuma alteracao automatica
nos animais. Responsividade 360/768/1280 sem overflow, com quatro screenshots.
Detalhes e entradas/resultados: QA_SPRINT_011.md.

## Execucao e auditoria

App: `node scripts/serve.cjs` e http://127.0.0.1:8026/index.html (usar outra porta
se ocupada). Testes: `node --test tests/*.test.js`. QA: `node scripts/qa-sprint-011.cjs`
com Playwright no ambiente e QA_BROWSER_PATH opcional. Sem dependencia de runtime
nova para o aplicativo. ZIP portatil e diff completo gerados no encerramento:
`sprint_011_entrega.zip`, `docs/SPRINT_011_ENTREGA.diff`, apenas auditoria.

## Limites e governanca

Android fisico pendente. QA offline reabre pagina no mesmo contexto do navegador,
nao reinicia aparelho/processo. Grandes volumes e leitor de tela completo nao
homologados. Sem edicao/exclusao de evento reprodutivo nesta V1, backup ou nuvem.
Sem itens obrigatorios de implementacao pendentes; aprovacao pertence ao CTO.

Nenhuma pausa arquitetural necessaria. Nenhum git add, commit, push, merge,
rebase, criacao/exclusao de branch ou alteracao de remote executado. Sprint 012
nao iniciada. Git status da entrega em qa-sprint-011/git-status.txt; alteracoes
nao staged. Artefatos ZIP/diff nao devem entrar no futuro commit.

Sugestoes futuras apenas registradas no backlog: correcao auditavel de eventos,
medicao de escala, nascimento/genealogia e planejamento reprodutivo. Nenhuma
dessas sugestoes foi implementada nesta Sprint.
