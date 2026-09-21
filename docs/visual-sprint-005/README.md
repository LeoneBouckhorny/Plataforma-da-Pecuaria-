# Checkpoint visual - Sprint 005

Status: proposta 01, aguardando aprovacao visual do CEO/CTO.

Este diretorio contem somente uma prova visual isolada. Nao constitui a
entrega completa da Sprint 005 e nao aplica a identidade ao aplicativo.

## Abrir

Abrir `index.html` deste diretorio no navegador. A pagina funciona por
arquivo local, sem servidor, conexao, instalacao de pacotes ou build.
As interacoes apenas demonstram estados visuais; nao salvam registros.

## Referencia e interpretacao

Referencia primaria: brand board oficial enviado pelo CEO nesta conversa.
O simbolo foi reconstruido em SVG, simplificado para uso digital:

- emblema verde profundo com canto superior direito reto;
- cabeca bovina frontal, orelhas laterais e focinho largo;
- tres barras ascendentes;
- faixas curvas de pastagem, incluindo detalhe terroso;
- versoes positiva e inversa, sem efeitos tridimensionais.

Nao e uma extracao do arquivo vetorial original. A simplificacao da cabeca,
das curvas e das proporcoes deve ser avaliada pelo CEO/CTO no checkpoint.

A paleta principal segue os cinco valores oficiais. No texto "da" sobre
fundo claro foi utilizado verde derivado #166534 para contraste; sobre
verde profundo usa-se #22C55E. Cores de assets SVG/PNG sao literais por
serem arquivos autonomos; cores da pagina ficam em `tokens.css`.

Montserrat nao foi incorporada nem baixada. A pilha de fontes e
Montserrat, system-ui, -apple-system, "Segoe UI", sans-serif.
O resultado tipografico pode variar conforme as fontes instaladas.
Os wordmarks SVG mantem texto editavel, ainda nao convertido em curvas.

## Conteudo

- Logo horizontal sobre fundo claro e verde profundo.
- Simbolo em 96, 48 e 32 pixels.
- Favicon PNG de 32 pixels.
- Icones PNG de 180, 192 e 512 pixels.
- Maskable PNG de 512 pixels com simulacao de recorte circular.
- Header desktop e amostra mobile de 360 pixels.
- Botao primary com hover, active, focus-visible e disabled.
- Card de propriedade com conteudo ficticio identificado na prova.

O botao Instalar e a navegacao sao amostras de interface; esta pagina nao
e uma PWA. Manifest, Service Worker, cache e icones do produto nao foram
alterados. Nenhuma funcionalidade nova foi adicionada ao app.

## Verificacao

`qa-checkpoint.cjs` usa Playwright e sharp do runtime externo de
desenvolvimento, sem adicionar dependencias ao projeto. `generate-assets.cjs`
gera as variantes SVG e PNG a partir de `assets/symbol.svg`.

Com os pacotes disponiveis no NODE_PATH:

```powershell
node docs/visual-sprint-005/generate-assets.cjs
node docs/visual-sprint-005/qa-checkpoint.cjs
```

O QA foi executado em Microsoft Edge headless:

- 360x800, 768x1024 e 1280x900 sem overflow global;
- todos os assets carregados, sem requests HTTP externos;
- nenhum erro JavaScript;
- foco visivel, feedback do botao e selecao da navegacao verificados;
- oito pares de contraste com relacao acima de 4.5:1;
- dimensoes dos cinco PNGs confirmadas;
- maskable opaco, com todos os pixels do simbolo dentro do circulo seguro
  de raio 40% da largura total.

Evidencias completas em `qa-results.json` e `screenshots/`.
As capturas desktop/mobile foram inspecionadas visualmente.
Suite existente reexecutada com `node --test tests/*.test.js`: 87 testes,
87 aprovados, 0 falhas, 0 ignorados. Nenhum arquivo do aplicativo foi
modificado; somente este diretorio de checkpoint foi criado.
Esse QA valida a prova, nao representa homologacao Android ou instalacao
real dos novos icones. O teste de atualizacao PWA sera feito na integracao
autorizada posteriormente.

## Ponto de aprovacao

Avaliar o reconhecimento do bovino, fidelidade ao conceito do brand board,
proporcoes do wordmark, variantes clara/escura, legibilidade do icone,
header mobile e linguagem dos componentes.

A aplicacao ao produto, atualizacao de manifest/cache e expansao do Design
System dependem da aprovacao visual do CEO/CTO.
