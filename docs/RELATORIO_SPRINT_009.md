# Relatorio Sprint 009 - Hierarquia e cadastro rapido opcional

Status: entrega para auditoria do CTO. Sem aprovacao presumida.
Data: 2026-09-23. Android fisico: pendente.

## Entrega tecnica

1. Resumo: Rebanho hierarquico e geracao opcional/atomica de animais na criacao de lote; cadastro individual e normal preservados.
2. Branch: `feature/sprint-009-hierarchy-fast-registration`, baseada em `4e55c2d` (Sprint008). Branch preexistente, nao criada pelo agente.
3. Criados: tres modulos em src (fast-lot-registration-core/repository e herd-hierarchy-core); tres suites correspondentes; runner e empacotador009; ADR, modelo, QA, relatorio, inventario e evidencias. Lista integral em `SPRINT_009_ARQUIVOS.txt`.
4. Modificados: README.md, index.html, src/herd-controller.js, src/herd-repository.js, src/lot-core.js, styles/layout.css, sw.js, docs/BACKLOG_PRODUTO.md, tests/animal-history-pwa.test.js, tests/design-system.test.js, tests/herd-pwa.test.js, tests/lot-core.test.js e tests/pwa-config.test.js.
5. Removidos: nenhum arquivo. Alteracao de autoridade de Lot.category para categories justificada no ADR, sem apagar registros legados na leitura.
6. DB_VERSION:5, sem nova migration, store ou indice. local-database.js nao alterado.
7. Cache: `plataforma-pecuaria-shell-v7`, incluindo tres modulos novos. Politicas SW preservadas, sem skipWaiting.
8. Hierarquia: propriedade -> pasto -> lote -> animal, contexto no controller, sem alterar draft global.
9. Pastos: nome, area opcional, lotes ativos e animais ativos derivados; acesso ao detalhe.
10. Lotes dentro de pastos: listagem contextual, abrir/editar/mover/arquivar/reativar conforme protecoes existentes.
11. Animais dentro de lotes: identificacao, sexo, categoria/raca individuais, status e ficha completa; busca contextual.
12. Lotes sem pasto: acesso explicito; paddockId continua opcional.
13. Animais sem lote: acesso explicito; lotId continua opcional.
14. Cadastro normal: apenas lote, zero animais/eventos; edicao nunca dispara geracao.
15. Cadastro rapido: checkbox desmarcada por padrao; campos condicionais, preview e confirmacao; exclusivo de novo lote.
16. Categories: array normalizado, personalizado, multiplas escolhas; autoridade unica para novos registros.
17. Breeds: array normalizado, personalizado, multiplas escolhas; sem inferencias individuais falsas.
18. Sugestoes de racas: Nelore, Brahman, Tabapua, Guzera, Sindi, Indubrasil, Angus, Senepol, Mestico e Outra; UI acentuada.
19. Machos/femeas: inteiros >=0; sequencia deterministica com machos primeiro. Campos transitorios.
20. Total: soma calculada no formulario, >0 no rapido; contadores posteriores derivados dos animais ativos, sem persistencia duplicada.
21. Numero inicial: obrigatorio1..9999; fim=inicio+total-1 <=9999; bloqueio antes de qualquer escrita.
22. Tags: reutiliza TagCodeCore; UUID independente; tagNumber+tagSuffix; lotId/tagOriginLotId apontam inicialmente ao novo lote; sem nomes artificiais.
23. Preview: quantidade, machos/femeas e primeiro/ultimo codigo; confirmacao antes de gravar. Cancelamento nao escreve.
24. Categoria individual: unica categoria e copiada; zero ou multiplas deixam string vazia.
25. Raca individual: mesma regra, sem distribuicao arbitraria.
26. Transacao: readwrite unica; validacoes de contexto, sufixo e TODO intervalo antes do primeiro add; lote/animais/eventos abortam juntos em erro.
27. Registered: um evento por individuo com UUID, animalId e snapshots existentes de lote/pasto.
28. Duplicidade: escopo accountId/propertyId; sufixos arquivados e tags arquivadas/legadas continuam reservados.
29. Concorrencia: duas conexoes reais disputando mesmo sufixo/intervalo; apenas uma conclui, sem residuos da outra.
30. Movimento: arvore atualizada sem reload; tag e origem preservadas; eventos administrativos existentes mantidos; sem animal.paddockId.
31. Legado: category lido como array quando necessario, breeds ausente como[]; nenhuma escrita automatica, nenhuma migration. Atualizacao explicita adota formato canonico.
32. Offline: navega, cria normal/rapido, move e consulta ficha com rede e servidor desligados; reabre mantendo dados.
33. Testes anteriores:211 preservados. Ajustes de expectativas para cachev7 e categories canonico, sem remocao de cobertura.
34. Testes novos:41, em core rapido, repository atomico e hierarquia. QA de concorrencia adicional em navegador real.
35. Total:252 testes,252pass,0fail,0skipped,0cancelled. Saida integral em `qa-sprint-009/tests.txt`; sintaxe em `syntax.txt`.
36. QA hierarquia: aprovado no runner, incluindo isolamento, busca, legado, sem vinculos e draft intacto.
37. QA normal: loteC, raca personalizada e edicao sem geracao, aprovado.
38. QA rapido: D1..25,10machos+15femeas,25registered; cancelar preserva formulario sem gravar, aprovado.
39. QA categorias: Recria+Engorda e Engorda+Reprodutoras mantidas no lote, individuais vazias, aprovado.
40. QA racas: Nelore unica copiada; Nelore+Brahman nao inferidas; Caracu personalizada, aprovado.
41. QA conflito: legado0017f arquivado bloqueia F1..25 inteiro; falha no decimo animal/evento reverte tudo; concorrencia uma vencedora, aprovado.
42. QA movimento:0023D paraB conserva codigo e origem; B paraP02 atualiza arvore; pesagem explicitamente vinculada450kg aparece na ficha, aprovado.
43. QA offline:10gerados, depois9no lote+1movido; todos persistem na reabertura sem servidor/rede, aprovado no desktop automatizado.
44. QA100animais:100individuos+100eventos em226ms observados entre confirmacao e persistencia/render. Uma amostra local, nao benchmark nem garantia Android.
45. QA360x800: sete telas, sem overflow horizontal; campos empilhados, preview e confirmacao acessiveis.
46. QA768x1024: sete telas, sem overflow horizontal; formulario e navegacao utilizaveis.
47. QA1280x900: sete telas, sem overflow horizontal; mais captura da ficha offline. Evidencias em `qa-sprint-009/`.
48. Limitacoes: Android fisico/launcher e reinicio do aparelho nao executados; offline em contexto isolado com fechamento/reabertura da pagina. Persistencia de milhares de animais nao medida.
49. Problemas conhecidos: nenhum bloqueio observado nos cenarios executados. Banco continua somente local, sem backup; tela de lote muito populoso pode exigir futura estrategia de escala. Testes puros de9999 nao certificam desempenho de persistencia.
50. Sugestoes: somente as propostas separadas abaixo, nao implementadas.
51. Pausas arquiteturais: nenhuma necessaria; schema/atomicidade existentes atenderam aos testes desta Sprint.
52. Diff: `docs/SPRINT_009_ENTREGA.diff`, completo contra HEAD incluindo arquivos novos e binarios; validado com git apply --reverse --check sem alterar indice.
53. ZIP: `sprint_009_entrega.zip`, projeto com caminhos internos portaveis `/`, CRC verificado. Nao inclui .git. ZIP e diff sao artefatos de auditoria, nao devem entrar no futuro commit.

## Execucao

```powershell
node scripts/serve.cjs
# http://127.0.0.1:8026/index.html
node --test tests/*.test.js
# Playwright disponivel no ambiente; QA_BROWSER_PATH opcional:
node scripts/qa-sprint-009.cjs
# Python padrao, sem pacotes adicionais:
python scripts/package-sprint-009.py
```

Se8026 ja estiver em uso, definir PORT para outra porta. Servir via localhost ou
HTTPS; file:// nao e homologacao de PWA. O runner de upgrade requer historico
Git contendo4e55c2d; os testes Node funcionam na copia extraida do ZIP.

## Sugestoes separadas do escopo

| Problema | Proposta | Beneficio | Riscos | Prazo | Arquitetura | Modulos |
| --- | --- | --- | --- | --- | --- | --- |
| Capacidade real em aparelhos modestos ainda desconhecida | Medir volumes progressivos em Android; so entao avaliar paginacao/virtualizacao | Decisao baseada no uso real | Sem medida, otimizar prematuramente ou limitar indevidamente | Estimar apos homologacao; nenhuma implementacao agora | Eventual estrategia de consulta, preservando atomicidade | herd-controller, herd-hierarchy-core, repositories e QA |
| Entrada em lote existente continua individual | Sprint futura para adicionar varios com previa/conflitos | Menos digitacao sem recadastrar lote | Duplicacao ou cadastro parcial se mal definido | Exige escopo/estimativa aprovados pelo CTO | Reutilizar transacao, sem assumir nova store | fast-lot-registration-core/repository, herd-controller, testes |

Demais itens somente no backlog: importacao CSV/planilhas, edicao em massa,
transferencia, etiquetas, RFID, balancas e filtros avancados.

## Governanca

Nenhum git add, commit, push, merge, rebase, reset --hard, criacao/exclusao de
branch ou alteracao de remote. HEAD mantido em4e55c2d. Nenhuma Sprint010 iniciada.
Nenhuma dependencia nova, backend, sincronizacao ou mudanca no IndexedDB.
Entrega aguarda auditoria do CTO e homologacao Android pelo CEO.
