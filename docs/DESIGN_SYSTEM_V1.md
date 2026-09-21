# Design System V1

## Marca

Plataforma da Pecuaria: pecuaria, tecnologia, dados e confianca.
Assinatura institucional: "Dados que impulsionam o agro".
Referencia: brand board oficial do CEO e checkpoint visual aprovado pelo CTO.

O simbolo aprovado une cabeca bovina frontal, tres barras ascendentes e
faixas curvas de pastagem. O SVG do checkpoint foi copiado sem alteracao
geometrica. Nao utilizar elementos equestres ou reconstruir livremente o
simbolo nas proximas telas.

`assets/branding/` contem simbolo positivo/inverso e logos horizontais.
O header utiliza simbolo + nome em texto, sem assinatura em qualquer largura.
As variantes horizontais com assinatura ficam reservadas a aplicacoes onde
o texto seja legivel (largura recomendada de pelo menos 680px). Em espacos
menores, usar simbolo + nome ou apenas simbolo; nunca encolher a assinatura.

`assets/icons/` contem PNGs de 180, 192, 512, maskable 512 e favicon 32.
Todos derivam dos assets aprovados. O maskable tem fundo opaco e seu
conteudo essencial cabe no circulo central de raio 40% da largura total.
O recorte circular e uma simulacao; a homologacao do launcher Android e
uma verificacao posterior em dispositivo fisico.

## Camadas

- `styles.css`: agregador de cinco arquivos locais.
- `styles/tokens.css`: cores, escalas tipograficas, espacos, raios, bordas,
  sombras, tamanho de controle/icone e transicao.
- `styles/base.css`: reset, tipografia, foco global, hidden e movimento reduzido.
- `styles/components.css`: botoes, navegacao, formularios, estados, cards,
  KPIs, tabelas, barras e dialogos.
- `styles/layout.css`: posicionamento e responsividade das telas existentes.
- `styles/print.css`: impressao e romaneio.

Nao ha framework novo nem etapa de build no produto.

## Paleta

| Token | Valor | Uso |
| --- | --- | --- |
| --color-primary | #0B3D2E | Estrutura, navegacao, acao principal |
| --color-accent | #22C55E | Selecao e foco sobre fundo escuro |
| --color-text | #1F2937 | Texto principal |
| --color-earth | #B88B6F | Apoio da marca e detalhes secundarios |
| --color-background | #F5F7F4 | Fundo do aplicativo |

Superficies brancas, texto secundario #58645F e bordas #798C80 em campos
preservam contraste. Verde vibrante nao e usado como fundo geral, texto
pequeno sobre branco ou substituto indiscriminado de estados semanticos.

Estados possuem tokens de texto e superficie: success, warning, danger e
info. `--color-focus` referencia `--color-info`; `--color-focus-inverse`
referencia `--color-accent`. Nao inserir cores isoladas em focus-visible.
Mensagens mantem os textos existentes; cor nao e o unico indicador.

Cores literais sao aceitas apenas em tokens, SVG/PNG autonomos e nos
metadados HTML/manifest que exigem um valor concreto. Os testes verificam
a correspondencia desses metadados com os tokens.

## Tipografia e espacos

Pilha: Montserrat, system-ui, -apple-system, "Segoe UI", sans-serif.
Nenhuma fonte foi baixada ou incorporada; nao ha fonte licenciada fornecida
localmente. A renderizacao usa a fonte disponivel no dispositivo.

- Regular 400: corpo e campos.
- Semibold 600: labels, navegacao e botoes.
- Bold 700: titulos e indicadores.
- Escala: 12, 14, 16, 20, 24 e 26px; KPIs com numerais tabulares.
- Espacos: 4, 8, 12, 16, 24, 32 e 48px.
- Raios: 4, 6 e 8px. Sem cards arredondados excessivamente.
- Sem escala tipografica por vw e sem espacamento negativo entre letras.
- Dimensoes especiais de grid, media queries e impressao permanecem no
  layout correspondente, sem tentar transformar cada medida em token.

## Componentes

Primary: verde profundo, texto inverso, hover/active derivados.
Secondary: superficie clara, borda forte e texto principal da marca.
Ghost: fundo e borda transparentes; hover com superficie secundaria.
Danger: texto/borda semanticos, hover com superficie de erro.
Todos possuem foco, active e disabled; aria-busy tem apresentacao para
usos futuros, sem alterar os fluxos assincronos existentes.

Altura minima de botoes/campos: 44px. Botoes de icone mantem 44x44px e
rotulos acessiveis. Adicionar animal/pasto possui tooltip nativo. Impressao,
exportacao e exclusao usam icone + texto. As remocoes nas linhas mantem
aria-label individual e o simbolo familiar de fechar/remover.

Icones de interface: seis SVGs Lucide locais, outline de 2px em viewBox 24.
A licenca e a origem estao em `assets/ui/`. O simbolo da marca e separado
dos icones de acao. Nao misturar familias nem carregar bibliotecas remotas.

Inputs, selects e textareas compartilham bordas, foco, disabled e erros.
Checkbox mantem controle nativo, acento primario e label com area de toque.
Validacoes e mensagens continuam controladas pelo JavaScript original.

Cards de propriedade/historico usam borda leve e raio de 6px. O selecionado
tem borda e marcador lateral; propriedade arquivada mantem texto de estado.
Superficies de secao nao usam sombra ou moldura de card. Sombra pequena
disponivel no card generico e sombra moderada apenas em dialogos.

KPIs: quantidade, total, media, arrobas e valor. Valor usa superficie clara
de sucesso e borda primaria; demais indicadores usam superficie branca.
Quebra de valores longos nao pode aumentar a largura da pagina.

Tabelas mantem rolagem horizontal interna e cabecalhos discretos; linhas
recebem hover sutil. Barras usam a largura calculada pelo codigo existente,
com display block para que a largura do span seja respeitada.

## Responsividade e acessibilidade

Header: 48px para o simbolo desktop, 40px no mobile. Sem assinatura pequena.
Navegacao fica em faixa verde profundo, com destaque vibrante restrito.
Em 360px, os quatro destinos existentes cabem sem rolagem global.
Se os dois controles PWA estiverem hidden, o container tambem fica oculto,
sem reservar padding, linha ou altura. Essa regra usa CSS :has; o alvo e
um navegador moderno compativel com a PWA.

Em ate 1100px as areas de entrada/romaneio e historico ficam empilhadas.
Em ate 600px os formularios ficam em uma coluna. Tabelas continuam com
rolagem propria. As regras de impressao restauram as colunas do romaneio.

Foco visivel de 3px, labels preservados, contrastes testados, controles de
44px e prefers-reduced-motion respeitado. O QA de contraste nao equivale a
uma auditoria WCAG completa com leitor de tela.

## Usos proibidos

- Assinatura ilegivel em header mobile, favicon ou icone PWA.
- Verde vibrante como fundo dominante ou texto pequeno sobre branco.
- Cores avulsas em componentes quando existe token correspondente.
- Gradientes decorativos, sombras grandes ou ornamentos em cards.
- Fontes, icones ou imagens essenciais dependentes de rede.
- Dados ficticios ou modulos novos para preencher a interface.
- Alteracoes de comportamento ou persistencia justificadas como mudanca visual.
