# QA Sprint 005 - Identidade visual e Design System

Execucao: 2026-09-21. Branch: feature/sprint-005-visual-identity.
Base comparativa: 043381f (Sprint 004). Ambiente: Windows, Node.js e Edge
headless via Playwright do runtime externo. Nao foram instaladas dependencias
de runtime no projeto.

## Resultado automatizado

Comando: `node --test tests/*.test.js`.

```text
tests 97
suites 0
pass 97
fail 0
cancelled 0
skipped 0
todo 0
```

Os 87 testes anteriores foram preservados. Apenas os valores esperados de
paleta e cache no teste PWA foram atualizados. Dez novos testes cobrem
tokens/paleta, camadas CSS, hardcodes, URLs locais, assets aprovados,
assinatura/header, foco e toque, fontes offline, icones/licenca, metadados
e contraste (algumas dessas verificacoes pertencem ao mesmo teste).

## QA de navegador reproduzivel

Comando: `node scripts/qa-sprint-005.cjs`, com Playwright disponivel no
NODE_PATH. O script usa perfil isolado, portas locais efemeras e escopo
`/app/`; nao acessa os dados reais do produtor. O servidor de baseline le
arquivos do commit 043381f com git show, sem checkout ou alteracao de branch.

Evidencia estruturada: `qa-sprint-005/results.json`.
Galeria: `qa-sprint-005/index.html`.

| Cenario / entrada | Resultado esperado | Obtido |
| --- | --- | --- |
| V2 carregado, propriedade, sessao e draft; publicar visual V3 no servidor de teste | Ativacao natural, dados identicos | Aprovado; comparacao integral das seis stores |
| Fechar cliente antigo antes de reabrir | Somente cache v3 no estado final | Aprovado; v2 removido |
| Navegar para README.md | Index cacheado continua HTML do app | Aprovado |
| 450 + 510 kg, R$300/@, 50% | 2 animais, 960 kg, 480 kg, 32@, R$9.600 | Aprovado nas tres larguras |
| Exportar CSV pela interface | Arquivo com os pesos da sessao | Aprovado; reference.csv |
| Editar e finalizar no mesmo evento, antes de 500ms | Historico unico e draft ausente apos 800ms | Aprovado |
| Editar apos finalizar | Novo draft e snapshot anterior imutavel | Aprovado |
| Draft real, demo, reload | Restaurar draft real, nao demo | Aprovado |
| Filtro de propriedade | Historico vinculado visivel | Aprovado |
| Arquivar e reativar propriedade | Estado muda e historico preservado | Aprovado |
| Preco -1 e peso 0 | Mensagens proximas aos campos | Aprovado; screenshots de erro |
| Impressao emulada | Controles ocultos, dados e estimativas presentes | Aprovado; PDF e screenshot |
| Eventos de disponibilidade/instalacao simulados | Botao aparece, depois some sem espaco vazio | Aprovado |
| Online, offline, fechar pagina, reabrir, pesar, finalizar, consultar historico | App e dados funcionam sem rede | Aprovado nas tres larguras |
| Excluir sessao offline | Sessao e itens vinculados removidos | Aprovado; sessao anterior preservada |

O QA registra cinco grupos de cenarios (atualizacao, protecao do index e
tres fluxos por largura), alem de 39 verificacoes de largura em capturas.
Nenhum erro JavaScript capturado. As operacoes do app utilizam os mesmos
scripts da Sprint 004; git diff de app.js e src/ permaneceu vazio.

## Atualizacao do cache

Antes: plataforma-pecuaria-shell-v2. Depois: plataforma-pecuaria-shell-v3.
DB_VERSION permanece 3, com 1 conta, 1 setting, 1 draft, 1 propriedade,
1 sessao e 2 itens no cenario de migracao visual. Objetos completos antes
e depois foram comparados, nao apenas contagens.

O runner inicialmente observava o cache durante a transicao entre workers;
isso podia capturar v2/v3 coexistindo. Foi ajustado para observar a ativacao
a partir de uma pagina fora do scope e so entao reabrir o app. Nenhuma
mudanca no ciclo de ativacao do Service Worker foi feita para o teste.

## Responsividade e visual

Larguras/alturas: 360x800, 768x1024 e 1280x900.
Em todas as capturas: document.documentElement.scrollWidth <= innerWidth.
Header mobile sem acao PWA disponivel: 112px, sem linha vazia reservada.
Header desktop/tablet sem controles PWA: 128px.

Capturados: calculadora vazia/preenchida, demo, historico vazio/preenchido,
detalhe, propriedades, formulario, arquivada, erro, instalacao disponivel
simulada e historico offline. Comparacoes antes/depois cobrem header,
calculadora, propriedades e historico. Capturas principais foram inspecionadas
visualmente. As tabelas usam rolagem interna, sem overflow da pagina.

Na inspecao foi ajustado display block no preenchimento das barras, para
respeitar a largura calculada existente; nenhuma formula foi alterada.

## Acessibilidade e assets

- Onze pares de contraste testados diretamente a partir dos tokens: texto
  >=4.5:1; borda de campo >=3:1. Foco utiliza token oficial.
- Labels e aria-label das acoes existentes preservados.
- Botoes de icone 44x44px e controles com altura minima 44px.
- Estados nao dependem apenas de cor; texto de status/validacao mantido.
- Montserrat nao incorporada: fallback local, sem CDN.
- Assets de marca e icones PWA identicos aos aprovados no checkpoint.
- Dimensoes PNG verificadas; area segura maskable ja validada no checkpoint,
  com zero pixels essenciais fora do circulo. Paridade binaria testada.
- Todos os CSS e assets referenciados existem no app shell e funcionam
  na reabertura offline, inclusive o simbolo do header.

## Limites reais

- Nao houve homologacao em Android fisico nem atualizacao real do launcher.
- beforeinstallprompt/appinstalled foram simulados para validar estados e
  ocupacao de espaco; isso nao e uma instalacao nativa aprovada.
- Impressao foi emulada com PDF; nao foi testada impressora fisica.
- Leitor de tela e auditoria WCAG completa nao foram executados.
- O teste fecha/reabre a pagina em contexto offline; nao reinicia o processo
  inteiro do navegador nem simula encerramento do sistema operacional.
- Esta entrega aguarda auditoria do CTO. Nenhuma publicacao ou commit foi feito.
