# QA Sprint 007 - Historico Individual

## Ambiente e Resultado

Executado em 21/09/2026, Windows, Node.js, Edge/Chromium headless 153.0.4234.48.
Scripts: `scripts/qa-sprint-007.cjs` e `scripts/package-sprint-007.py`.
Playwright vem do ambiente de QA, nao e dependencia adicionada ao aplicativo.
O navegador pode ser configurado com `QA_BROWSER_PATH`, com fallback local.

Suite Node: **174 tests, 174 pass, 0 fail, 0 skipped, 0 cancelled**.
Preservados os 138 testes anteriores; 36 novos. Fixtures/expectativas de versao
foram atualizadas para a migration aditiva e a nova transacao com eventos.
Nenhum teste foi removido ou marcado como skipped.
Saida integral em `qa-sprint-007/tests.txt`; sintaxe em `qa-sprint-007/syntax.txt`.

Navegador: execucao completa passou, sem erros JavaScript capturados.
Evidencias estruturadas com IDs/snapshots: `qa-sprint-007/evidence.json`.

## Testes Automatizados Novos

- Event core: quatro tipos, timestamps invalidos, nota vazia, IDs, snapshots,
  ordenacao deterministica, nota editavel sem trocar contexto/tipo.
- Event repository: criar/editar/listar/get note, eventos automaticos imutaveis,
  isolamento por conta/propriedade/animal, referencias forjadas recusadas.
- Cadastro e movimento: registered; A -> B, A -> null, null -> A; A -> A sem
  evento; updateAnimal com lotId diferente recusado; snapshots imutaveis.
- Status: transicoes reais geram eventos; repeticao nao gera; mover pasto do
  lote nao produz eventos em massa.
- Atomicidade: falhas nas stores animals e animal-events para create/change/
  archive/reactivate; oito casos com rollback total.
- Pesagem: ID explicito, snapshots, ausencia de auto-link por tag, draft legado,
  duplicidade por ID mesmo com tags diferentes, animal ausente/arquivado,
  outra conta/propriedade ou lote incompativel.
- Timeline: events + pesagens, ultimo peso, contagem, nascimento e registro
  legado derivados, isolamento, snapshots de animal apos renomeacao.
- Migration: stores antigas preservadas, indice animalId adicionado aos itens.
- PWA: cinco novos modulos presentes no HTML/app shell v5, arquivos locais.

## QA de Navegador

| Teste | Entradas e acao | Esperado | Obtido |
| --- | --- | --- | --- |
| Migration bloqueante | Base real 1682473/V4 com conta, setting, propriedade, pastos, lotes, animal 101, sessao/item tag 101 e draft | Preservar nove stores e adicionar store/indice sem fatos novos | Igualdade profunda antes/depois; V5, animal-events vazia, indice animalId presente, nenhum auto-link |
| Atualizacao PWA | Cache v4 instalado, atualizar, fechar cliente antigo e reabrir | Ativacao natural v5 | Somente cache v5, sem skipWaiting |
| A Ficha | Animal 101 Estrela, Femea, Novilha, Nelore, nascimento e Novilhas 2026/P01 | Dados atuais, local e sem pesagens vinculadas | Passou; registro V4 exibido como marco legado derivado |
| B Observacao | Apartada para avaliacao.; fechar, reabrir, reload; editar | Nota persiste e editavel | Passou, mesma nota editada sem duplicacao |
| C Mudanca | Novilhas 2026/P01 -> Recria/P02 | Estado + evento atomicamente | Passou, origem/destino completos no JSON |
| D Snapshot | Renomear Novilhas 2026 para Novilhas Antigas | Evento conserva nome anterior | Passou |
| Cadastro novo | Criar Animal 102 na V5 | Um registered | Passou |
| E Pesagem explicita | 101 selecionado, 450 kg; segundo item livre 510 kg; salvar draft/reload/finalizar | Ficha recebe apenas 450 kg | Passou, um item vinculado e um livre |
| F Sem inferencia | Texto tag 101 sem selecionar animal; finalizar | Nao aparecer na ficha | Contagem permaneceu 1 |
| G Duplicidade | Mesmo animal em duas linhas com tags textuais diferentes | Bloquear finalizacao | Dialog nao abriu e mensagem clara exibida |
| H Ultimo peso | Pesagens em 21/09 com 450 kg e 22/09 com 475 kg | Ultimo 475 kg, contagem 2 | Passou, sem lastWeight persistido |
| I Arquivar | Arquivar e reativar Animal 101 | Status events e pesos preservados; sem opcao arquivada | Passou |
| J Isolamento | Sao Romao/101 com nota exclusiva e 525 kg | Cada ficha mostra somente seus registros | Passou, Boa Vista com duas pesagens, Sao Romao com uma |
| Contexto da calculadora | Mudar lote e propriedade com linha vinculada | Limpar IDs incompativeis, preservar peso/tag | Passou; 450 kg e texto 101 preservados, aviso exibido |
| Snapshot individual | Renomear cadastro para tag 184/Matriz 184 | Pesagem antiga conserva 101/Estrela | Passou |
| DOM seguro | Nota contendo img/onerror | Texto literal, sem elemento/script | Nenhum img criado nem codigo executado |
| Rollback real | Forcar erro em animals ou animal-events nas quatro operacoes | Nenhum registro parcial | Oito casos passaram no IndexedDB real |
| K Offline | Rede desativada e servidor encerrado; note, mover lote, pesar 490 kg, finalizar, fechar/reabrir | Nota, mudanca, novo peso e timeline persistidos | Passou; offline true, serverListening false; peso 490 kg/contagem 3 |

## Responsividade e Inspecao

360x800, 768x1024 e 1280x900: lista de animais, ficha, timeline, formulario de
note, mudanca de lote, calculadora com seletor e historico. Todas as larguras
passaram `document.documentElement.scrollWidth <= window.innerWidth`.
Capturas em `qa-sprint-007/` (21 por tela/largura e uma ficha offline).
Inspecao visual confirmou dados, botoes, foco e formularios sem sobreposicao;
timeline em linhas simples, dialog com rolagem interna e Design System V1.
A tabela de entrada da calculadora preserva a rolagem local existente, sem
overflow global; a ficha/timeline nao exigem tabela larga.

## Limites da Evidencia

O teste offline fecha/reabre a pagina PWA em contexto isolado do navegador,
com rede desativada e servidor parado. Nao equivale a encerrar fisicamente um
Android instalado. Homologacao Android permanece pendente para CEO/CTO.
Nao foram executados testes de carga com milhares de animais ou validacao de
teclado virtual fisico. Nao ha backend/nuvem/backup ou funcionalidades da Sprint 008.
Nenhum teste apenas planejado foi marcado como executado.
