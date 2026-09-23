# QA Sprint 009

Status: executado em ambiente local, entregue para auditoria. Android fisico pendente.
Data: 2026-09-23. Branch: feature/sprint-009-hierarchy-fast-registration.
Base aprovada: 4e55c2d. Edge/Chromium headless 153.0.4234.48 no Windows.

## Evidencias e reproducao

- `qa-sprint-009/evidence.json`: entradas, resultados e medidas do navegador.
- `qa-sprint-009/tests.txt`: saida TAP integral de `node --test tests/*.test.js`.
- `qa-sprint-009/syntax.txt`: resultado de node --check em app.js, sw.js, src/*.js e scripts/*.cjs.
- `qa-sprint-009/*.png`: telas nos tres viewports e ficha offline.
- `scripts/qa-sprint-009.cjs`: cenarios reproduziveis em contexto descartavel.

```powershell
node --test tests/*.test.js
node scripts/qa-sprint-009.cjs
```

O runner de navegador requer Playwright disponivel no ambiente de QA, nao no
aplicativo, e Chromium/Edge local. QA_BROWSER_PATH permite definir o executavel.
Se Playwright estiver fora da resolucao padrao, configurar NODE_PATH apontando
para o node_modules existente. Nao foi adicionada dependencia. O runner exige
o historico Git com 4e55c2d para servir a Sprint 008 e testar upgrade real.
O ZIP sem .git permite rodar todos os testes Node; o QA de upgrade precisa ser
rodado no repositorio. O servidor temporario e o contexto sao encerrados pela
suite, sem limpar dados da instalacao do produtor.

## Testes automatizados

252 testes: 252 pass, 0 fail, 0 skipped, 0 cancelled.
211 testes anteriores preservados + 41 novos. Assertions de cache foram
atualizadas para v7; a assertion antiga de Lot.category passou a exigir
categories normalizado e ausencia da autoridade duplicada. Nenhum teste removido.

| Grupo | Entradas e esperado | Obtido |
| --- | --- | --- |
| Contagens | 0+0 rejeitado; 12+13=25; negativos, decimais, texto, vazio, infinito e numeros inseguros rejeitados | Conforme |
| Intervalo | 1/25 termina 25; 23/20 termina 42; 9999/1 valido, 9999/2 invalido | Conforme |
| Sequencia/sexo | 1..3+A => 0001A..0003A; 2+2 => male,male,female,female | Conforme |
| Classificacoes | Uma categoria/raca herdada; multiplas nao inferidas; trim/deduplicacao/customizados | Conforme |
| Legado | category vira array na leitura sem write; breeds ausente vira []; array presente e autoridade | Conforme |
| Normal/edicao | Cria/edita lote sem animais, eventos ou contadores persistidos | Conforme |
| Rapido | 1 lote+25 UUIDs+25 registered e snapshots; nenhum animal.paddockId | Conforme |
| Atomicidade | Falha no lote, decimo animal ou decimo evento; stores identicas antes/depois | Conforme |
| Conflitos | Tag legada normalizada ativa/arquivada no meio do intervalo; sufixo arquivado | Conforme, nenhuma criacao parcial |
| Escopo | Pasto de outra propriedade/conta, ausente ou arquivado; conta incorreta | Bloqueados |
| Movimentos | Mover gerado preserva codigo/origem; sufixo utilizado fica bloqueado | Conforme |
| Hierarquia | Agrupamento, ativos/arquivados, sem vinculo, mudancas sem mutar entrada | Conforme |
| Volume puro | Plano de 100 e de 9999 animais no limite do intervalo | Conforme; nao e teste de persistencia de 9999 |
| PWA/regressao | Modulos no HTML/cache, assets locais, regras SW e demais suites anteriores | Conforme |

## QA de navegador

Execucao final iniciada em 2026-09-23T16:22:27.645Z. Todos os grupos abaixo
passaram; nenhuma excecao JavaScript foi capturada. Assertions verificam dados
reais no IndexedDB, nao apenas presenca de elementos.

| Cenario | Procedimento / esperado | Obtido |
| --- | --- | --- |
| Upgrade | Abrir 008, criar cadastros/draft, atualizar SW, fechar pagina controlada, esperar ativacao natural e reabrir | Cache v6 removido/v7 ativo; todas as stores identicas; DB5 |
| QA A | Boa Vista -> Piquete 01 -> Novilhas A -> 0023A; buscar por tag no pasto; buscar inexistente | Navegacao/ficha/busca corretas; nenhum resultado falso |
| Legado/isolamento | Novilhas via category legado, breeds ausente; abrir outra propriedade; conferir draft global | Novilhas visivel, racas vazias, sem mistura e draft intacto |
| Sem vinculos | Abrir animais sem lote e lote Misto sem pasto | Registros acessiveis |
| QA B | Criar Vacas C com rapido desmarcado, raca personalizada Caracu; editar | Apenas lote; contagem de animais permanece 2; edicao sem geracao |
| QA C | Novilhas 2027/D/P01, Recria+Engorda, Nelore, 10 machos+15 femeas, inicio1 | Preview 0001D..0025D; cancelar nao grava; confirmar cria25+25 e abre lote sem reload |
| QA D/E | Misto com Engorda+Reprodutoras e Nelore+Brahman | Arrays completos no lote; categoria e raca individuais vazias |
| QA F conflito | Tag legada arquivada 0017f; tentar F1..25 | invalid, todas as stores identicas; mensagem identifica0017F |
| QA F falhas | Injetar excecao no decimo add de animal e depois no decimo add de evento em transacao IDB real | failed em ambos; rollback completo, inclusive lote |
| Concorrencia | Duas conexoes LocalDatabase criam H1..25 simultaneamente | Um saved, um invalid; somente25animais+25eventos |
| QA G | Mover gerado0023D de D para B; mover B de P01 para P02 | Hierarquia atualiza;0023D/origem mantidos; timeline preservada |
| Pesagem | Digitar0023D sem selecionar, depois selecionar explicitamente e finalizar450kg | Primeiro animalId vazio; depois ficha mostra450kg |
| Performance | Criar I com50machos+50femeas, numa unica transacao | 100animais+100eventos;226ms da confirmacao ate persistencia/render; sem travamento permanente |
| QA H | Rede desativada+servidor encerrado; fechar/reabrir; criar pasto, lote normalY e rapidoZ5+5; mover animal/lote; fechar/reabrir | 10gerados preservados,9emZ+1movido paraY; ficha/eventos/movimento disponiveis;DB5 |

As falhas e o legado conflitante sao injetados exclusivamente pelo runner no
contexto isolado. Nao ha endpoints, atalhos ou alteracoes de producao para QA.

## Responsividade e inspecao visual

360x800, 768x1024 e 1280x900: capturados rebanho, pasto, lote/animais, ficha,
formulario normal, preview rapido e confirmacao. 21 capturas mais ficha offline.
Assertions em todos os casos: scrollWidth <= viewport, sem overflow horizontal.
Inspecao das capturas: campos e botoes acessiveis, preview legivel, cards simples,
contexto sem sobreposicao; formulario longo rola verticalmente no mobile.
Feedback positivo usa success-inline do Design System existente.

Arquivos por viewport: `360-*.png`, `768-*.png`, `1280-*.png`.
Estado offline final: `offline-ficha.png`.

## Limites e homologacao pendente

- Viewport emulado nao equivale a Android fisico. Instalacao/launcher, teclado,
  memoria e atualizacao da instalacao real precisam de homologacao do CEO.
- Fechar/reabrir no runner significa fechar a pagina e abrir nova pagina no mesmo
  contexto de navegador. Nao foi reiniciado o sistema operacional nem o aparelho.
- 226ms e uma amostra local, nao benchmark nem SLA. Nao houve medicao com milhares
  de registros persistidos ou no Android de entrada. Nenhuma promessa de capacidade.
- Persistencia continua local; perda/limpeza do armazenamento nao possui backup
  ou sincronizacao. Nenhuma dessas funcionalidades foi adicionada.
- Nao foram encontrados bloqueios funcionais nos cenarios executados. Nao houve
  pausa arquitetural; volumes maiores devem ser medidos antes de alterar a solucao.

Roteiro Android: atualizar online a instalacao existente, fechar completamente,
reabrir e desligar internet; navegar propriedade/pasto/lote/ficha; criar lote
normal e rapido5+5; mover animal e lote; fechar/reabrir offline; conferir10animais,
eventos, origem preservada, pesagem vinculada e historico. Resultado: PENDENTE.
