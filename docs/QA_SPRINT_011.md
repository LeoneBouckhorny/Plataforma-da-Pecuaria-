# QA Sprint 011 - Reproducao V1

Data: 07/10/2026. Base 1bd9bfe. Branch feature/sprint-011-reproducao-v1.
Ambiente: Windows, Edge Chromium 154.0.4258.62 headless via Playwright local,
timezone America/Sao_Paulo. Contexto isolado, sem tocar dados do produtor.

## Testes automatizados

Fluxo economico: primeiro core/repository/eventos/Sanidade (66/66), depois
PWA/Design System (23/23). Suíte integral final: **309 testes, 309 pass, 0 fail,
0 skipped, 0 cancelled**, incluindo os 280 anteriores e 29 novos.
Saida integral: qa-sprint-011/tests.txt. Sintaxe: qa-sprint-011/syntax.txt.

| Entradas/cenario | Esperado e obtido |
| --- | --- |
| Cada um dos cinco reproductionTypes validos | Evento valido com type=reproduction |
| Tipo desconhecido; data ausente/impossivel | Bloqueio sem escrita |
| pregnant, not_pregnant, inconclusive | Valores internos preservados |
| Diagnostico vazio/texto livre | Erro em result |
| Cobertura com sireAnimalId real | ID + nome/brinco capturados na transacao |
| Texto externo igual ao brinco do touro | Nenhum vinculo inferido |
| Sire inexistente, outra conta/propriedade, female/unknown | Bloqueio sem escrita |
| Sire cadastrado + externo simultaneos | Bloqueio de ambiguidade |
| Renomear touro/lote apos evento | Snapshot anterior inalterado |
| Matriz male nos cinco tipos | Bloqueio em repository |
| Matriz unknown | Salva com warning; Animal identico |
| Arquivar matriz/sire | Historico intacto; novo registro bloqueado |
| Parto 2, machos 0, femeas ausente | Inteiros e null preservados |
| Total vazio/zero/negativo/fracionario/infinito/inseguro | Bloqueio |
| Soma superior ao total; contagem negativa/fracionaria | Bloqueio |
| Timeline/resumo; eventos fora de ordem | Ordenacao cronologica e resumo derivados |
| Tipo/resultado/lote snapshot/periodo inclusivo | Filtros sem alterar eventos |
| Conta/propriedade incorretas | Leitura isolada e escrita bloqueada |
| Falha de escrita ou colisao de ID | Nenhuma alteracao parcial/sobrescrita |
| Localizacao corrompida | Bloqueio da referencia fora de propriedade |
| updateNoteEvent sobre reproduction | Edicao recusada |
| App shell e DOM | Dois modulos locais em v9; DB5; APIs seguras |

## QA funcional em navegador

Runner: `node scripts/qa-sprint-011.cjs`, Playwright disponivel no ambiente de
QA; QA_BROWSER_PATH opcional. Usa baseline Git 1bd9bfe, portanto exige esse
commit localmente. Servidor temporario com porta dinamica. Evidencia estruturada:
qa-sprint-011/evidence.json (checks, 27 verificacoes de viewport, zero pageerrors).

| Cenario/entrada | Resultado esperado | Resultado obtido |
| --- | --- | --- |
| v8.1 com cadastros/evento health -> v9 | Ativacao natural, dados intactos | Todas as 10 stores identicas antes/depois; DB5; cache anterior removido |
| Femea 0023A: cio 15/08, IA 01/09, Prenhe 20/09, parto 07/10 | Timeline imediata decrescente | Parto, diagnostico, IA, cio; resumo Prenhe e datas corretas |
| IA: Touro X, ABC123, Tecnico QA | Campos textuais sem associacao | Salvos e apresentados na timeline |
| Diagnostico sem resultado; parto 1/femeas 2 | Erros junto do campo | Bloqueados; corrigidos para Prenhe e 1/femeas 1, salvaram |
| Notes com img/onerror textual | Sem execucao de HTML | Texto literal, nenhum elemento img na timeline |
| Outra matriz + touro 0025A | Selecao explicita e snapshot | ID real; Touro original e brinco preservados |
| Renomear touro para Touro renomeado | Evento antigo nao muda | Comparacao integral do evento identica e UI mostra Touro original |
| Opcoes de matriz/sire | Arquivados e sexos invalidos excluidos | Apenas femeas/unknown ativas e macho ativo nas listas correspondentes |
| Filtros diagnostico/Prenhe/lote/20-09 | Um resultado | 1; Nao prenhe = 0; outra propriedade = 0 |
| Ficha de macho -> evento; API diagnostico | Bloqueio | Mensagem, sem submit; repository retorna invalid |
| Unknown -> diagnostico Inconclusivo | Aviso e sexo preservado | Aviso visivel antes de salvar, sex continua unknown |
| Falha injetada em add IndexedDB real | Nada parcialmente salvo | failed e lista integral identica |
| Desligar rede e servidor, fechar/reabrir | App abre offline | Abriu por app shell v9 |
| Offline: registrar os cinco tipos | Todos persistem | Cinco eventos novos salvos pela UI |
| Fechar/reabrir novamente offline | Eventos e ficha persistem | 11 eventos na propriedade, 9 na matriz principal; Animals inalterados pelos registros |
| Arquivar matriz offline | Consulta continua, nova acao some | 9 eventos conservados na timeline; botao removido |

Os registros usados em QA sao exemplos de teste, nao recomendacoes ou
validacao de intervalos biologicos. A Sprint nao calcula previsoes.

## Responsividade e inspecao visual

360x800, 768x1024 e 1280x900: propriedade/filtros, formulario de diagnostico,
parto e selecao de touro, acoes ao final, ficha e timeline. ScrollWidth global
igual a largura em todos os casos; dialogos tambem sem overflow horizontal.
Capturas representativas inspecionadas:

- qa-sprint-011/360-calving.png
- qa-sprint-011/360-timeline.png
- qa-sprint-011/768-natural_service.png
- qa-sprint-011/1280-property.png

Na inspecao foi corrigido o hover da aba ativa da propriedade, que herdava fundo
claro com texto branco. Agora hover/active usam os tokens estruturais oficiais;
runner verifica o hover. Formularios longos usam rolagem interna, sem sobrepor
campos. Nao foi executada auditoria completa de leitor de tela.

Uma execucao intermediaria do runner falhou ao comparar a cor durante a transicao
CSS do hover. O runner foi corrigido para aguardar a cor final; a repeticao final
passou integralmente. A suite unitaria nao foi repetida por essa mudanca exclusiva
de sincronizacao do QA e documentacao.

## Limites

Homologacao Android fisica pendente. Offline foi executado com fechamento e
reabertura de pagina no mesmo contexto Chromium, rede offline e servidor parado;
nao equivale a reiniciar aparelho/processo ou validar launcher instalado.
Grandes volumes nao foram homologados. Eventos reprodutivos V1 nao possuem
edicao/exclusao; dados continuam sem backup/sincronizacao.
