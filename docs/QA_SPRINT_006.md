# QA Sprint 006 - Estrutura do Rebanho

## Ambiente e Evidencias

Execucao em 21/09/2026, Windows, Node.js e Edge/Chromium headless.
Runner: `scripts/qa-sprint-006.cjs`; resultado detalhado com IDs e snapshots:
`qa-sprint-006/evidence.json`. Os testes usam contextos isolados, sem tocar
nos dados do navegador do produtor. Nenhuma API externa participa do fluxo.
Android fisico nao foi executado e depende de homologacao pelo CEO/CTO.

## Testes Node

`node --test tests/*.test.js`: 138 testes, 138 pass, 0 fail, 0 skipped,
0 cancelled. Os 97 anteriores permanecem; 41 casos novos. Somente expectativas
de versao foram atualizadas em testes anteriores; nenhuma cobertura removida.
Resultado integral: `qa-sprint-006/tests.txt`.
Sintaxe de app, service worker, src e runners: `qa-sprint-006/syntax.txt`.

Novos casos: validacao/normalizacao de Paddock, Lot e Animal; identidade imutavel;
area opcional e invalida; nascimento real/sexo; arquivos sem paddockId no animal;
CRUD; duas contas; propriedades homonimas; IDs colidindo; pais ausentes,
arquivados ou de outro contexto; arquivamento com filhos ativos; defaults
legados de draft/historico; filtros por ID; snapshot atual e imutabilidade;
ausencia de associacao automatica por brinco; modulos PWA e migration.

## Navegador

| Teste | Entradas/acao | Esperado | Obtido |
| --- | --- | --- | --- |
| Migration | Sprint 005 real no commit 05fd9e8, V3, conta, propriedade, setting, draft, sessao/itens | Preservar seis stores e adicionar tres | Igualdade profunda antes/depois das seis stores; V4 e stores novas vazias |
| Atualizacao PWA | Cache v3 instalado, atualizar, fechar cliente antigo, reabrir | Ativacao natural v4 | Somente cache v4; sem skipWaiting |
| A Pastos | Boa Vista: Piquete 01 12,5 ha; Piquete 02 8 ha; reload | Dois pastos persistidos | Passou, area numerica 12.5 e 8 |
| B Lote | Novilhas 2026, categoria Novilhas, Piquete 01; reload | Vinculo mantido | Passou |
| C Animais | 101 e 102, femea, Novilha, lote cadastrado | Dois animais ativos cadastrados | Passou, contador derivado = 2 |
| D Local | Mover lote para Piquete 02 | Ambos animais exibem novo local sem regravacao | Passou; registros de animais profundamente identicos |
| E Propriedades | Sao Romao com mesmos nomes e brinco 101 | Sem mistura de IDs | Passou, tres cards locais e nenhum da Boa Vista |
| F Vinculos | Forjar animal Boa Vista -> lote Sao Romao e lote Boa Vista -> pasto Sao Romao | Recusar | Ambos invalid, sem gravacao |
| G Arquivar | Arquivar P02 ocupado; mover lote para P01; arquivar P02; arquivar lote com animais | Bloquear, permitir, bloquear | Passou com mensagens explicitas |
| H Pesagem | 450 + 510 kg, 300 R$/@, 50%, lote formal; reload draft | 2; 960 kg; 480 kg; 32 @; R$ 9.600 | Passou; IDs e snapshots propriedade/lote/pasto gravados |
| Draft escopo | Trocar propriedade com lote selecionado | Limpar lote, manter duas linhas | Passou |
| Autosave | Finalizar logo apos alterar seletores, esperar 800 ms, reload | Sem draft finalizado restaurado | Draft vazio; calculadora com zero animais |
| I Snapshot | Renomear lote, mover para P02, consultar historico | Manter Novilhas 2026/P01 | Passou, sessao profundamente identica |
| Filtros | Historicos de lotes homonimos de propriedades diferentes + legado | Filtrar ID e sem vinculo separadamente | Uma sessao em cada filtro |
| Validacao DOM | Animal sem tag/nome; area -1; texto contendo img/onerror | Erros proximos; HTML como texto | Mensagens nos campos, nenhum elemento img nem script executado |
| Busca | Buscar 102 | Um animal | Passou |
| Concorrencia | Arquivar pasto e criar lote ligado simultaneamente no IndexedDB real | Apenas operacao consistente salva | Um saved, um invalid |
| Duas contas | Conta B/pasto B referenciado pela A; listagem A/propriedade B | Recusar e listar vazio | invalid; zero registros |
| Rollback | Escrever e lancar erro no callback transacional | Desfazer escrita | Registro original preservado |
| Impressao | Historico vinculado em media print | Botoes ocultos; snapshots visiveis | PDF gerado, controles ocultos |
| J Offline | Desativar rede no contexto E encerrar servidor HTTP | CRUD, fechar/reabrir, finalizar/historico sem sinal | Passou; navigator.onLine=false; serverListening=false |

O teste J criou Piquete Offline, Lote Offline e OFF-01; editou area, desvinculou
e reassociou animal, arquivou/reativou lote vazio e mudou seu pasto. Fechou a
pagina, abriu novamente pelo mesmo URL sem servidor, confirmou persistencia,
finalizou pesagem e repetiu fechar/reabrir para consultar historico. Evidencia
inclui registro do animal e sessao finalizada. Isso valida reabertura da pagina
PWA no contexto do navegador, nao encerra o processo inteiro do Android.

## Responsividade e Inspecao Visual

360x800, 768x1024, 1280x900: Rebanho completo (pastos, lotes e animais), formularios
de novo pasto/lote/animal, calculadora com lote e historico. Em todos:
`document.documentElement.scrollWidth <= window.innerWidth`.
Formulario de animal foi rolado ate Salvar/Cancelar, verificando que os botoes
cabem no viewport. Capturas `*-animal-acoes.png` comprovam acesso ao rodape.
Cards sem tabelas largas; mesmo Design System e branding da Sprint 005.
Capturas em `qa-sprint-006/`; PDF em `qa-sprint-006/romaneio.pdf`.

## Intercorrencias e Limites

Duas execucoes preliminares do runner leram o DOM antes de terminar a operacao
assincrona (mensagem de validacao e detalhe historico). As esperas foram
corrigidas para observar o resultado real; a suite foi repetida integralmente.
Nao se tratava de aprovar teste pendente: somente a ultima execucao completa
e considerada evidencia. Nenhum erro JavaScript foi registrado nessa execucao.

Sem homologacao fisica Android, instalacao/launcher reais ou testes de carga
com milhares de cadastros. Nao ha backup/nuvem; limpeza do armazenamento do
navegador pode remover dados locais. Fluxos fora da Sprint 006 nao foram criados.
