# QA Sprint 008

## Ambiente e Resultado

Data: 2026-09-23. Branch feature/sprint-008-property-context-tags, base 19d825e.
Node test runner: 211 testes, 211 pass, 0 fail, 0 skipped, 0 cancelled.
Sintaxe: 33 arquivos JavaScript, 0 erros. Saidas integrais em
qa-sprint-008/tests.txt e qa-sprint-008/syntax.txt.

Navegador: Edge/Chromium 153.0.4234.48 headless, perfil isolado, IndexedDB e
Service Worker reais. QA nao alterou dados do produtor. Evidencias estruturadas
em qa-sprint-008/evidence.json; screenshots nessa mesma pasta.
Android fisico nao foi executado e nao esta declarado como aprovado.

## Regressao e Fixtures

Os 174 casos anteriores continuam executados; nenhum teste foi removido,
desabilitado ou teve assercoes de comportamento retiradas. Fixtures de criacao
foram adequadas ao contrato novo: suffix explicito para novos lotes; animais
por nome quando a identificacao nao e objeto do teste; helper identified usa os
repositories reais para emitir numero e suffix nos testes de eventos/historico.
Assercoes de snapshot agora usam 0101A e corrigem numero pela API tagNumber.
Teste de ausencia de auto-link continua usando texto igual ao codigo cadastrado.
Testes de cache agora esperam v6. Legado real e testado em upgrade de navegador
e em fixtures inseridas diretamente como registros anteriores.

37 testes novos cobrem core, repository, legado, origem, duplicidades, reserva,
movimento, correcao, cross-scope, falta de lote e rollback de gravacao/evento.

## Casos Executados

| Caso / entrada | Esperado | Obtido |
| --- | --- | --- |
| Upgrade da Sprint 007 com animal 101, lote sem suffix, draft e vinculos | DB V5 e registros identicos; cache v6 | PASS: comparacao profunda de todas as stores; cache v6 |
| A: abrir Boa Vista por UUID | Visao geral, Rebanho, Pesagens | PASS |
| B: abrir Rebanho em Boa Vista e Sao Romao | Somente registros da propriedade; ficha/CRUD acessiveis | PASS, sem entrada global Rebanho |
| Draft Sao Romao com lote e animalId; abrir Boa Vista e voltar | Nenhuma alteracao do draft | PASS, store drafts identica, selects preservados |
| C: Novilhas A, Garrotes B, novo lote a | Normalizar A/B; bloquear duplicado com nome do lote | PASS, erro junto a tagSuffix |
| D: numero 23 no lote A | Preview e cadastro 0023A, UUID proprio, origem A | PASS |
| E: 1, 9, 23, 999, 9999 | 0001A, 0009A, 0023A, 0999A, 9999A | PASS no preview; core tambem valida 287 |
| Numeros 0, 10000, -1, 23.5, A23 | Rejeitar sem fechar/perder campos | PASS na UI e core |
| Suffix AA, 1, A1, acentos, simbolos ou vazio | Rejeitar novos lotes | PASS em core/repository |
| F: novo 23 em A com 0023A existente | Recusar sem animal/evento parcial | PASS |
| G: mover 0023A de Novilhas para Garrotes | lotId B, tag 0023A, origem A, evento | PASS |
| H: tentar suffix A -> C depois de emitir e mover | Bloquear | PASS na UI e repository |
| Arquivar animal/lote e tentar reutilizar suffix | Continuar reservado/bloqueado | PASS em IndexedDB real e unitarios |
| Duas conexoes gravando suffix D/d simultaneamente | Apenas um lote salvo | PASS: saved + invalid |
| Duas conexoes emitindo 0007D simultaneamente | Apenas um animal salvo | PASS: saved + invalid |
| Falha de escrita animals / animal-events | Rollback completo | PASS nos testes de transacao |
| I: animal antigo 101 e lote sem suffix | Nao converter; ficha continua acessivel | PASS no upgrade e na UI |
| Legado 184 / tag antiga igual a 0024a | Preservar texto; bloquear nova emissao conflitante | PASS em repository |
| Duplicado legado preexistente, editar nome/mover/arquivar | Nao transformar nem impedir manutencao sem trocar tag | PASS; nova emissao conflitante bloqueada |
| J: selecionar animal 0023A, finalizar 450 kg | Timeline com um peso | PASS |
| Digitar 0023A sem selecionar animal e finalizar | animalId null; nao acrescentar peso a ficha | PASS, timeline continua com uma pesagem |
| Corrigir numero 23 -> 32 -> 23 | UUID/origem estaveis; snapshot anterior 0023A | PASS |
| Nota contendo img/onerror | Texto literal, nenhum elemento img criado | PASS, sem erro JavaScript |
| Pesagens de Boa Vista / Sao Romao / Historico global | 2 / 1 / 3 sessoes respectivamente | PASS |
| Leitura de historico retida antes do resolve | Ainda busy, lista ja limitada a Boa Vista | PASS: 2 linhas, nenhum registro Sao Romao |
| Filtro global diferente; acao Ver pesagem | Abrir ultima finalizada, sem bloqueio por filtro antigo | PASS |
| Impressao de pesagem contextual | Romaneio visivel; botao de voltar oculto | PASS em media print |
| K: fechar, sem rede/servidor, reabrir, criar Z e animal 7 | Criar 0007Z offline | PASS |
| Ainda offline: pesar 450, finalizar, fechar/reabrir e consultar ficha/historico | Peso e sessao persistidos | PASS, DB continua V5 |

## Responsividade e Revisao Visual

Viewports: 360x800, 768x1024, 1280x900. Em todos:
document.documentElement.scrollWidth <= window.innerWidth.

Capturados: lista de propriedades, detalhe/visao geral, rebanho, pastos, lotes,
animais, formulario de lote, formulario de animal, ficha e pesagens (10 por
viewport), mais ficha offline. Total: 31 capturas e verificacoes de largura.
Formularios extensos usam rolagem interna do dialog, sem overflow horizontal.
Preview do brinco fica logo apos numero/suffix e possui aria-live.
Revisao visual executada em capturas mobile, tablet e desktop; sem sobreposicao
incoerente. Focus-visible e tokens existentes preservados, erros textuais junto
ao campo, controles de toque herdados do Design System.

## Reproducao

```powershell
node --test tests/*.test.js
node scripts/qa-sprint-008.cjs
```

O segundo comando requer Playwright disponivel no ambiente (nao foi adicionado
como dependencia do produto). QA_BROWSER_PATH e opcional; o runner detecta
Edge/Chrome local no Windows ou usa Chromium do Playwright. O commit 19d825e
precisa existir no historico Git para servir a Sprint 007 durante o upgrade.
Servidor temporario, porta automatica e contexto isolado sao encerrados ao final.

## Limites

Durante repeticoes foi encontrado um defeito no runner: waitForFunction com
predicado async aceitava a Promise como truthy antes do resultado. Uma execucao
avancou para reabertura antes da ativacao correta e houve erro addEventListener
em elemento ausente; uma checagem adicional encontrou cache v6 ainda incompleto.
Confirmada a semantica no coreBundle.js local do Playwright (predicate sem await).
Corrigido somente no runner da Sprint 008 com polling de booleanos resolvidos,
timeout e verificacao de cache v6/HTML/controlador antes de reabrir. Politica do
SW do produto nao foi alterada. Resultado final abaixo considera a reexecucao
com essa espera corrigida; a falha intermediaria nao foi omitida.

Outra repeticao detectou a lista global anterior visivel por um intervalo antes
da leitura contextual terminar (3 linhas em vez das 2 da Boa Vista). Corrigida a
aplicacao sincronizando o filtro/lista imediatamente ao abrir Pesagens, antes
do await de IndexedDB. aria-busy sinaliza a leitura; QA espera sua conclusao.
Isso impede exibicao transitoria de registros de outra propriedade.

- Nao homologado em Android fisico, launcher ou teclado real.
- Media print inspecionada; nenhuma impressora fisica utilizada.
- Reabertura offline testada fechando a pagina do PWA e abrindo outra no mesmo
  contexto persistente de navegador, nao reiniciando o sistema operacional.
- Sem ensaio de milhares de animais, quota de armazenamento ou sincronizacao.
- Nenhum erro JS capturado no QA; nenhum teste conhecido pendente dentro do
  ambiente automatizado descrito. A auditoria final cabe ao CTO.
