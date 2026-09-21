# Relatorio da Sprint 005

Status: implementacao concluida, aguardando auditoria e aceite final do CTO.
Branch: feature/sprint-005-visual-identity.
Base: 043381f, Sprint 004. Direcao visual: checkpoint aprovado pelo CTO.

## Resumo da implementacao

Identidade aplicada a Calculadora, Historico, Propriedades e area Premium
preexistente. Nenhuma tela de negocio nova foi adicionada. Simbolo aprovado
promovido sem alteracao de geometria; header com nome legivel e sem assinatura
reduzida. Verde profundo estrutural, verde vibrante restrito a selecao/foco.

`styles.css` agora agrega cinco camadas: tokens, base, components, layout e
print. Cores e escalas centralizadas, componentes consistentes, cards simples,
KPIs com numerais tabulares, tabelas com rolagem interna e foco oficial.
Um ajuste de display no span das barras faz a largura calculada ser exibida.

Montserrat usa o fallback autorizado, sem arquivo de fonte ou CDN.
Seis SVGs Lucide locais foram incluidos com licenca, sem biblioteca runtime.
Icones PWA 180/192/512/maskable e favicon 32 usam os assets aprovados.

O botao de instalacao mantem sua logica anterior. Quando indisponivel e sem
aviso de conexao, seu container nao ocupa espaco no header mobile.

## Arquivos

Modificados: README.md, index.html, styles.css, sw.js, manifest.webmanifest,
tests/pwa-config.test.js e os quatro PNGs PWA existentes.

Criados: styles/, assets/branding/, assets/ui/, favicon-32.png,
tests/design-system.test.js, documentacao do Design System/ADR/QA/relatorio,
scripts de servidor/QA/empacotamento, galeria e evidencias. O checkpoint
aprovado em docs/visual-sprint-005 tambem integra a entrega.

Lista completa arquivo por arquivo: SPRINT_005_ARQUIVOS.txt.
Nenhum arquivo permanente removido. O conteudo de styles.css foi substituido
pelo agregador; suas responsabilidades visuais foram distribuidas nas camadas.

## Preservacao funcional

- app.js e todos os arquivos src/ permanecem identicos a base.
- DB_VERSION permanece 3; stores e indices intocados.
- Calculos, validacoes, autosave, finalizacao, CSV, snapshots, filtros,
  contas e propriedades sem alteracao de regras.
- Service Worker: somente CACHE_VERSION v3 e APP_SHELL foram alterados.
- Sem skipWaiting, reload forcado, backend, login ou sincronizacao.

## Testes

97 testes automatizados: 97 pass, 0 fail, 0 cancelled, 0 skipped, 0 todo.
87 anteriores preservados e 10 novos testes de Design System/configuracao.
Saida integral: qa-sprint-005/tests.txt. Sintaxe: qa-sprint-005/syntax.txt.

QA Edge headless: cinco grupos de cenarios aprovados e 39 verificacoes de
largura. Calculadora, historico, propriedades, estados de erro/demo/offline
e instalacao simulada em 360x800, 768x1024 e 1280x900 sem overflow global.

Atualizacao real do Service Worker no navegador de teste: cache v2 -> v3,
ativacao natural apos fechar cliente antigo, apenas v3 ao final. Comparacao
integral do IndexedDB preservou conta, setting, draft, propriedade, sessao
e itens; DB_VERSION continuou 3.

Referencia: 450 + 510 kg, R$300/@, rendimento 50% => 2 animais, 960 kg,
media 480 kg, 32@, R$9.600,00. CSV gerado, impressao emulada sem controles.
Autosave pendente na finalizacao, edicao posterior, demo/reload, arquivamento,
reativacao, filtros e exclusao offline aprovados.

Ciclo offline: carregar online, desligar rede, fechar pagina, abrir novamente,
pesar, finalizar e consultar historico aprovado nas tres larguras.

45 screenshots novos, alem das capturas do checkpoint. Galeria navegavel e
comparacao antes/depois: qa-sprint-005/index.html. Inclui header, calculadora,
propriedades, historico, estados e detalhe do romaneio.

## Limitacoes e itens nao concluidos

Sem pendencia conhecida de implementacao no escopo autorizado. Aprovacao
tecnica final, publicacao e homologacao Android permanecem com CEO/CTO.

- Android fisico, instalacao nativa e atualizacao do launcher nao executados.
- Eventos de instalacao foram simulados apenas para verificar UI/controlador.
- Offline foi testado com reabertura de pagina no mesmo processo de navegador.
- Impressao em PDF/emulada; sem impressora fisica.
- Sem auditoria integral com leitor de tela; contrastes e foco foram testados.
- Montserrat nao fornecida; wordmarks usam a fonte local disponivel.

## Execucao

```powershell
node scripts/serve.cjs
node --test tests/*.test.js
```

Acesso local: http://127.0.0.1:8026/index.html.
QA de navegador: node scripts/qa-sprint-005.cjs com Playwright disponivel
externamente via NODE_PATH; requer o commit 043381f para a comparacao baseline.
O produto e os testes node:test nao dependem desses pacotes de QA.

## Sugestoes separadas

Homologar no mesmo Android ja instalado: problema a verificar e a atualizacao
real do launcher/cache. Proposta: abrir online, fechar por completo, reabrir
e repetir operacao offline. Beneficio: evidencia no dispositivo do produtor.
Risco: comportamento especifico do navegador/launcher. Prazo: uma sessao de
homologacao. Arquitetura: sem impacto previsto. Modulos: PWA e assets.

Fornecer Montserrat licenciada: problema e variacao tipografica entre sistemas.
Proposta: analisar arquivos locais e licenca em etapa autorizada. Beneficio:
uniformidade. Riscos: tamanho do cache e validacao de licenca. Prazo depende
do fornecimento. Impacto: fontes locais e APP_SHELL. Modulos: styles/tokens.css,
assets/fonts e sw.js. Nao implementado automaticamente.

Nenhuma pausa arquitetural necessaria.

## Entrega e governanca

- docs/SPRINT_005_ENTREGA.diff: diff completo, inclusive novos arquivos/binarios.
- sprint_005_entrega.zip: projeto e evidencias, caminhos ZIP com /.
- Diff e ZIP sao artefatos de auditoria e nao devem integrar futuro commit.
- Nenhum git add, commit, push, merge ou rebase executado.
- Nenhuma Sprint 006 iniciada. Aguardar avaliacao do CTO.
