# QA Sprint 010 - Sanidade V1

Data: 2026-09-23. Branch: feature/sprint-010-sanidade-v1. Base: f268996.
Resultado local: aprovado nos cenarios executados; auditoria CTO e Android pendentes.

## Execucao e evidencias

Durante implementacao: suites health e animal-event, sem repetir toda a regressao.
Entrega: `node --test tests/*.test.js`, 274 testes, 274 pass, 0 fail, 0 skipped,
0 cancelled. Sao 252 anteriores + 22 novos; nenhum removido ou enfraquecido.
Expectativas de cache atualizadas de v7 para v8. Sintaxe: 40 JS, zero erros.
Saida integral: `qa-sprint-010/tests.txt` e `qa-sprint-010/syntax.txt`.

Runner: `node scripts/qa-sprint-010.cjs`. Requer Playwright disponivel no ambiente
de QA e Chromium/Edge; `QA_BROWSER_PATH` opcional. Sem dependencia nova no app.
Quando necessario, NODE_PATH aponta para o node_modules local ja instalado.
Requer Git com f268996 para servir o baseline v7. Contexto temporario isolado,
servidor proprio, fechamento de ambos ao terminar; nao toca dados do produtor.
`qa-sprint-010/evidence.json` registra resultados, browser e viewports.

## Testes de dominio/repository

| Entrada/cenario | Esperado | Obtido |
| --- | --- | --- |
| vaccination, deworming, medication e other | Tipos validos com dados exigidos | Conforme |
| Tipo desconhecido, data ausente/invalida | Recusar | Conforme |
| Produto vazio nos tres primeiros; other sem descricao | Recusar, apontar campo | Conforme |
| Dose2,5/2.5 com unidade | Persistir2.5; dose opcional sem inferencia | Conforme |
| Dose0/negativa/texto/infinito/exponencial; dose sem unidade | Recusar | Conforme |
| Datas opcionais e invalidas | Preservar validas; recusar invalidas, sem calculo | Conforme |
| Individual com snapshots/IDs forjados | Capturar contexto real; UUIDs gerados no repository | Conforme |
| Coletivo1,2,3,5 | Quatro eventos, IDs distintos, operationId unico;4 excluido | Conforme |
| Animal/propriedade/conta incompatíveis, selecao vazia/repetida | Nenhuma escrita | Conforme |
| Propriedade/animal arquivado, animal movido depois da selecao | Recusar sem dados parciais | Conforme |
| Sem lote | Snapshots null, registro individual valido | Conforme |
| Falha no evento18 de30 | Rollback integral | Conforme |
| Renomeacao e mudanca de lote | Historico e filtros usam snapshot original | Conforme |
| Timeline health; filtros por tipo/lote/periodo | Mesmo evento sem duplicacao persistida | Conforme |
| Tentativa de editar health como note | Recusar | Conforme |
| PWA | DB5 e modulos locais em shellv8 | Conforme |

Uma falha inicial no fixture de teste (repository sobrescrito pelo objeto lote)
foi corrigida antes da execucao final. Nao houve falha pendente de produto.

## Navegador real

Edge/Chromium153.0.4234.48 headless no Windows; cinco grupos do runner passaram,
zero erros JavaScript capturados. As verificacoes consultam IndexedDB real.

- Upgrade v7 -> v8: ativacao natural apos fechar pagina controlada, remocao seletiva
  do cache anterior; comparacao integral das stores identica e DB_VERSION5.
- Boa Vista/Piquete01/NovilhasA: UI selecionou0001A/0002A/0003A/0005A e desmarcou0004A.
  Produto vazio bloqueou escrita. Depois: quatro health, mesmo operationId,
  snapshots corretos e nenhum evento em0004A.
- Ficha0004A: manejo individual de vermifugacao apareceu imediatamente, com dose,
  proxima aplicacao e carencia. Sanidade mostrou cinco registros.
- Entrada pela propriedade: filtro de lote selecionou cinco animais; desmarcar
  todos desabilitou envio; cancelar nao gravou. Filtros de tipo/data e isolamento
  entre propriedades passaram. Texto HTML malicioso apareceu literalmente, sem DOM/script.
- Renomear lote/pasto nao alterou snapshots. Falha injetada no add18 de30 de uma
  transacao IndexedDB real retornou failed e manteve todos os eventos anteriores
  identicos. Injecao somente no contexto do runner, sem atalhos de producao.
- Rede desativada e servidor encerrado: fechar/reabrir, registrar medicamento
  coletivo em quatro animais e other individual no0004A; fechar/reabrir novamente.
  Dez eventos persistidos, consulta e timeline disponiveis. Arquivar0004A preservou
  seus dois health e o removeu da proxima selecao coletiva (quatro candidatos).

## Visual e limites

360x800,768x1024,1280x900: formulario/acoes e listagem sem overflow horizontal
global. Inspecao visual: campos, selecao e botoes utilizaveis, rolagem vertical
no dialogo, componentes/tokens existentes. Quatro capturas representativas:
`360-form.png`, `360-sanidade.png`, `768-timeline.png`, `1280-sanidade.png`.

Android fisico nao executado. Fechar/reabrir no runner significa nova pagina no
mesmo contexto Chromium, nao reinicio de aparelho. Nao foram medidos milhares de
eventos, launcher ou teclado Android. Nao ha backup/nuvem/recuperacao externa.
Roteiro Android pendente: atualizar online, reabrir offline, repetir coletivo
com um desmarcado, individual, filtros e ficha; fechar/reabrir e conferir dados.
