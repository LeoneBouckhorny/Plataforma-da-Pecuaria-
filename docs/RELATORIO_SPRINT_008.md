# Relatorio da Sprint 008

Status: implementada e entregue para auditoria do CTO; nao autoaprovada.
Data: 2026-09-23.

1. **Resumo:** gestao centrada em propriedade e brincos padronizados por lote de origem, preservando pesagem, ficha, eventos e offline.
2. **Branch:** feature/sprint-008-property-context-tags, baseada em 19d825e. Ja existia limpa ao iniciar; nenhuma branch criada/excluida pelo agente.
3. **Criados:** src/tag-code-core.js; tests/tag-code-core.test.js; tests/tag-code-repository.test.js; scripts/qa-sprint-008.cjs; scripts/package-sprint-008.py; ADR 008, modelo de identificacao, QA, este relatorio, inventario e evidencias em docs/qa-sprint-008. Lista integral em SPRINT_008_ARQUIVOS.txt.
4. **Modificados:** README.md, app.js, index.html, sw.js, styles/layout.css, docs/BACKLOG_PRODUTO.md, src/animal-core.js, src/lot-core.js, src/herd-repository.js, src/herd-controller.js, src/animal-detail-controller.js e fixtures/testes existentes relacionados. Inventario lista todos, sem omitir testes.
5. **Removidos:** nenhum arquivo. Removidos apenas acesso global Rebanho e seletor redundante de propriedade dessa tela; funcionalidades reposicionadas.
6. **DB_VERSION:** 5, inalterado; zero migrations, stores ou indices novos.
7. **Navegacao:** Propriedades -> propriedade -> Visao geral / Rebanho / Pesagens. Calculadora, Historico global e Premium existente preservados.
8. **Detalhe:** nome/localizacao reais por propertyId, retorno a lista. Acoes de editar/arquivar/reativar continuam nos cards de propriedade.
9. **Visao geral:** contadores derivados de pastos/lotes/animais ativos e sessoes registradas; nenhum contador persistido ou grafico ficticio.
10. **Rebanho:** mesmos CRUDs, ficha, observacoes, movimentos e status dentro da fazenda escolhida.
11. **Pesagens:** painel/repository de historico reutilizados, filtro por UUID, detalhe/CSV/impressao/exclusao preservados.
12. **tagSuffix:** campo do lote, normalizado trim/uppercase, obrigatorio em novos lotes.
13. **Validacao:** uma letra A-Z; numero inteiro 1..9999, preview e erros textuais; regras tambem no repository.
14. **Unicidade:** suffix e tag completa unicos na propriedade; verificacao e escrita na mesma transacao readwrite. Concorrencia validada em duas conexoes reais.
15. **Lotes legados:** ausencia de suffix aceita, nenhuma atribuicao automatica; configuracao explicita permitida.
16. **tagNumber:** armazenado como string de quatro digitos; opcional para cadastro apenas por nome.
17. **Zero-padding:** 1 -> 0001, 23 -> 0023, 287 -> 0287, 9999 -> 9999.
18. **Tag completa:** composicao pelo repository, por exemplo 0023A; UUID permanece chave tecnica.
19. **tagOriginLotId:** lote de emissao, separado de lotId atual; cliente nao pode forjar origem.
20. **Protecao:** suffix bloqueado apos emissao, mesmo com animal movido/arquivado. Correcao de numero preserva origem e UUID.
21. **Duplicidade:** inclui caixa, legados e arquivados. Nenhuma gravacao parcial de animal/evento em falha.
22. **Animais legados:** 101, 184, BR-22 permanecem; sem conversao automatica. Duplicados anteriores nao sao deduplicados nem bloqueiam manutencao sem alterar tag.
23. **Movimento:** muda lotId e registra evento; tag, numero, suffix e origem ficam intactos.
24. **Ficha:** codigo completo, numero/codigo de origem quando padronizado, lote atual e timeline existente.
25. **Pesagem:** selecao por animalId; snapshot captura codigo atual no momento da finalizacao e nao e regravado ao corrigir cadastro.
26. **Sem auto-link:** confirmado: texto 0023A sozinho produz animalId null e nao entra na ficha.
27. **Offline:** fechar/reabrir sem rede nem servidor, cadastrar lote/animal, pesar/finalizar, reabrir e consultar ficha/historico executado com sucesso.
28. **PWA:** cache v6 inclui tag-code-core; atualizacao real v5 -> v6 preservou todas as stores V5; estrategias inalteradas.
29. **Testes anteriores:** 174 mantidos, fixtures ajustadas ao contrato novo sem retirar assercoes de comportamento. Detalhes em QA_SPRINT_008.md.
30. **Novos:** 37 testes de core/repository/legado/atomicidade, alem dos cenarios de navegador.
31. **Total:** 211 pass, 0 fail, 0 skipped, 0 cancelled. Sintaxe de 33 arquivos JS aprovada. Saidas integrais em docs/qa-sprint-008.
32. **QA navegacao:** isolamento Boa Vista/Sao Romao; draft identico antes/depois; gestao nao altera contexto da calculadora.
33. **QA lotes:** criacao/configuracao, unicidade, reserva apos arquivo e bloqueio de alteracao aprovados.
34. **QA codigos:** preview, padding, valores invalidos e emissao persistida aprovados.
35. **QA duplicidade:** erro por campo, sem escrita parcial; duas conexoes resultaram saved + invalid para lote e animal.
36. **QA movimento:** 0023A movido de A para B continua 0023A, com origem A e evento na timeline.
37. **QA legado:** upgrade com registros reais da Sprint 007 preservou dados; sem suffix inventado/conversao.
38. **QA pesagem:** vinculada e apenas textual, snapshots, filtros contextuais/globais, retorno a ultima finalizada e media print aprovados.
39. **QA offline:** lote Z/animal 0007Z criados sem rede; pesagem 450 kg persistiu apos fechar/reabrir; historico acessivel.
40. **QA 360:** sem overflow horizontal, navegacao contextual vertical, dialogs rolaveis, preview proximo ao numero.
41. **QA 768:** sem overflow; listas, formularios, ficha e historico capturados.
42. **QA 1280:** sem overflow; mesmos fluxos capturados. Total 31 screenshots, incluindo offline.
43. **Limitacoes:** Android fisico pendente; nenhum teste de impressora real, reinicio do SO ou escala com milhares de animais. Armazenamento continua local sem backup remoto.
44. **Problemas conhecidos:** nenhum erro funcional detectado na suite/QA executados. Limite V1 de 26 suffixes por propriedade e busca linear no conjunto do escopo sao deliberados.
45. **Sugestoes:** apenas backlog autorizado e recomendacao separada abaixo; nada implementado fora do escopo.
46. **Pausas arquiteturais:** nenhuma necessaria; banco/indices preservados.
47. **Diff:** docs/SPRINT_008_ENTREGA.diff, completo incluindo arquivos novos/binarios, gerado sem alterar indice Git.
48. **ZIP:** sprint_008_entrega.zip, projeto e evidencias com separadores internos /, validacao CRC e caminhos portaveis.

## Execucao

```powershell
node scripts/serve.cjs
node --test tests/*.test.js
node scripts/qa-sprint-008.cjs
```

Servidor padrao: http://127.0.0.1:8026/index.html; PORT permite outra porta.
QA requer Playwright disponivel e commit 19d825e no historico; aceita
QA_BROWSER_PATH. Pacote: python scripts/package-sprint-008.py.
Nao incluir ZIP/diff de auditoria no futuro commit.

## Sugestao Separada, Nao Implementada

**Problema:** V1 reserva suffixes A-Z e consulta os registros do escopo para unicidade;
propriedades grandes podem atingir limite ou maior latencia.
**Proposta:** medir volume/tempo em dados reais antes de decidir expansao e indice.
**Beneficio:** evoluir com numeros, mantendo contratos e legados claros.
**Riscos:** expansao exige rever formato, UX e compatibilidade; indice pode exigir migration.
**Prazo:** nao estimado sem volume-alvo/criterio de desempenho do CTO.
**Arquitetura:** sem impacto nesta entrega; qualquer schema novo exige aprovacao previa.
**Modulos futuros:** tag-code-core, herd-repository, local-database, testes e formularios.

## Governanca

Nenhum git add, commit, push, merge ou rebase nesta Sprint. Nenhum reset --hard,
criacao/exclusao de branch ou alteracao de remote. Nenhuma Sprint 009 iniciada.
Aguardar auditoria do CTO e homologacao Android do CEO.
