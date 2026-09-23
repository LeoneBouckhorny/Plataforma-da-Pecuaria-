# Relatorio Sprint 010 - Sanidade e Manejo V1

Entrega para auditoria do CTO; Android fisico pendente. Data: 2026-09-23.

1. Resumo/branch: Sanidade por propriedade, lote e ficha individual em `feature/sprint-010-sanidade-v1`, base f268996.
2. Arquivos: novos health-repository/controller, tres suites health, runner/empacotador010, ADR/QA/relatorio/inventario e evidencias. Modificados app.js, index.html, animal-event-core, animal-detail-controller, herd-controller, layout.css, sw.js, quatro testes PWA/design, README, backlog e modelo V5. Lista exata em `SPRINT_010_ARQUIVOS.txt`; nenhum arquivo removido.
3. Decisoes: store animal-events existente, DB_VERSION5 preservado, sem migration/indice novo; app shellv8; nenhum backend/dependencia. ADR_010 detalha regras.
4. Health: healthType, occurredAt, produto condicional, dose/unidade opcionais coerentes, via, lote do produto, responsavel, datas opcionais, notes e snapshots reais de lote/pasto. IDs de evento e operacao gerados no repository.
5. Individual: formulario na ficha, um evento por animalId explicito; timeline atualiza ao salvar. Brinco nao cria vinculo.
6. Coletivo: animais ativos do lote selecionados/desmarcaveis; N eventos com operationId UUID compartilhado. Origem pela propriedade tambem disponivel.
7. Atomicidade: revalidacao de escopo/estado/lote na mesma transacao; valida tudo antes de escrever. Falha18/30 comprovou rollback total em IndexedDB real.
8. Offline: criar individual/coletivo, consultar e reabrir funcionaram sem rede e sem servidor. Upgradev7->v8 preservou todas as stores e DB5.
9. Testes novos:22, cobrindo tipos, validacao, snapshots, selecao, isolamento, estados, rollback, timeline, filtros e PWA.
10. Suite:274/274, zero falhas/skips/cancelamentos;252 anteriores preservados. Sintaxe:40arquivos JS sem erros. Logs integrais em `qa-sprint-010/`.
11. QA:360x800,768x1024,1280x900 sem overflow global; quatro screenshots. Cenario1,2,3,5 coletivo e4 individual passou, repetido offline. Detalhes em QA_SPRINT_010.md.
12. Limitacoes: Android fisico pendente; reabertura automatizada de pagina, nao reinicio de aparelho; sem medicao em milhares de eventos. HealthV1 sem edicao/exclusao, prescricoes, estoque, lembretes ou calculo de carencia. Nenhum bloqueio conhecido nos testes executados.
13. Pausas arquiteturais: nenhuma. Propostas futuras somente no backlog, sem implementacao.
14. Git: HEADf268996 mantido, somente alteracoes locais da Sprint; indice vazio. `git status --short` registrado em `qa-sprint-010/git-status.txt`. Nenhum add, commit, push, merge, rebase, reset --hard, alteracao de branches/remotes ou Sprint011.

## Executar e auditar

```powershell
node scripts/serve.cjs
# http://127.0.0.1:8026/index.html (PORT configuravel)
node --test tests/*.test.js
node scripts/qa-sprint-010.cjs
```

QA requer Playwright disponivel, QA_BROWSER_PATH opcional e historico Git com
f268996 para upgrade. App e testes Node nao precisam de novas dependencias.

Artefatos finais: `docs/SPRINT_010_ENTREGA.diff` completo, incluindo novos arquivos,
e `sprint_010_entrega.zip` com caminhos internos `/` e CRC verificado. Ambos sao
somente auditoria, nao entram no futuro commit. Inventario inclui evidencias;
ZIP nao inclui .git. Nenhuma aprovacao do CTO ou homologacao Android e presumida.
