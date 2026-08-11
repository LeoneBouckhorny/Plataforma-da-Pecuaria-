# QA Sprint 000

Data do registro: 2026-07-27.

## Contexto da Correção Final

A auditoria do CTO identificou e exigiu correção para:

- vazamento do modo demonstração;
- parâmetros inválidos aparecendo no relatório;
- overflow mobile;
- modelo de dados sem vínculo direto entre animal e propriedade;
- data baseada em UTC.

As correções foram aplicadas sem implementar `localStorage`, `IndexedDB`, service worker, banco de dados, autenticação, sincronização ou funcionalidades da Sprint 001.

## Ambiente

- Aplicação estática: `index.html`, `styles.css`, `app.js`.
- Testes automatizados: Node.js nativo com `node:test` e `node:assert`.
- Teste visual/responsivo: Playwright usando Microsoft Edge instalado localmente em modo headless.

## Comandos Executados

```powershell
node --check app.js
node --test tests/calculator-core.test.js
```

Resultado:

- `node --check app.js`: aprovado.
- `node --test tests/calculator-core.test.js`: 14 testes aprovados, 0 falhas.

## Testes Automatizados

| Teste | Resultado |
| --- | --- |
| cenário de referência calcula quantidade, peso, arrobas e valor | aprovado |
| preço negativo invalida valor sem mostrar preço como válido | aprovado |
| rendimento negativo deixa arrobas e valor indisponíveis | aprovado |
| rendimento acima de 100 deixa arrobas e valor indisponíveis | aprovado |
| faixa inválida não bloqueia peso, arrobas ou valor | aprovado |
| faixa média menor que faixa leve deixa classificação indisponível | aprovado |
| brinco duplicado na sessão invalida os itens repetidos | aprovado |
| animal sem brinco é permitido com aviso | aprovado |
| peso zero é inválido | aprovado |
| peso negativo é inválido | aprovado |
| vírgula e ponto decimal são aceitos | aprovado |
| separadores de milhar brasileiros e internacionais são aceitos | aprovado |
| cálculo após remoção de animal é recalculado | aprovado |
| data local usa ano, mês e dia locais | aprovado |

## Cenário de Referência Obrigatório

Entrada:

- Animal 1: 450 kg;
- Animal 2: 510 kg;
- preço: R$ 300,00 por arroba;
- rendimento: 50%.

Resultado esperado:

- quantidade: 2 animais;
- peso total: 960 kg;
- peso médio: 480 kg;
- arrobas estimadas: 32;
- valor estimado: R$ 9.600,00.

Resultado obtido:

- quantidade: 2 animais;
- peso total: 960 kg;
- peso médio: 480 kg;
- arrobas estimadas: 32;
- valor estimado: R$ 9.600,00.

Status: aprovado.

## Modo Demonstração

Fluxo testado em navegador headless:

1. Carregar demonstração.
2. Adicionar um terceiro animal.
3. Editar `EX-001`.
4. Remover `EX-002`.
5. Verificar banner.
6. Clicar em `Limpar pesagem`.
7. Verificar limpeza total.

Resultados obtidos:

```json
{
  "afterDemo": {
    "bannerVisible": true,
    "animals": "2",
    "totalArrobas": "32 @",
    "value": "R$ 9.600,00",
    "paddockRows": 0
  },
  "demoAfterMutations": {
    "bannerVisible": true,
    "animals": "2",
    "tags": ["EX-001-EDITADO", "EX-003"]
  },
  "afterClear": {
    "bannerVisible": false,
    "animals": "0",
    "weighingName": "",
    "arrobaPrice": "300,00",
    "yieldRate": "50",
    "lightLimit": "300",
    "mediumLimit": "420",
    "date": "2026-07-27",
    "paddockRows": 0
  }
}
```

Status: aprovado.

## Parâmetros Inválidos

| Cenário | Resultado esperado | Resultado obtido | Status |
| --- | --- | --- | --- |
| Rendimento `101` | Nenhuma arroba total ou individual; valor indisponível | Total `Indisponível`; valor `Indisponível`; romaneio com arrobas `Indisponível`; cabeçalho `Rendimento inválido` | aprovado |
| Rendimento `-1` | Nenhuma arroba total ou individual; valor indisponível | Coberto por teste automatizado | aprovado |
| Preço `-1` | Nenhum preço negativo no relatório; valor indisponível | Valor `Indisponível`; cabeçalho `Preço inválido`; `pageTextHasNegativePrice: false` | aprovado |
| Faixa leve `abc` | Peso, arrobas e valor continuam; classificação indisponível | Peso `850 kg`; arrobas `28,3 @`; valor `R$ 8.500,00`; seção informa classificação indisponível | aprovado |
| Faixa média menor que leve | Classificação indisponível e mensagem clara | Coberto por teste automatizado | aprovado |

## Validações Obrigatórias

| Cenário | Resultado |
| --- | --- |
| brinco vazio | permitido com aviso; animal entra no cálculo se peso válido |
| peso vazio | item bloqueado com mensagem de campo |
| peso igual a zero | item bloqueado com mensagem de campo |
| peso negativo | item bloqueado com mensagem de campo |
| peso não numérico | item bloqueado com mensagem de campo |
| preço por arroba negativo | valor estimado indisponível; cabeçalho não mostra preço negativo |
| rendimento abaixo de 0% | arrobas e valor indisponíveis |
| rendimento acima de 100% | arrobas e valor indisponíveis |
| brinco duplicado na mesma sessão | itens duplicados invalidados |
| vírgula e ponto como separador decimal | ambos aceitos |
| separadores de milhar BR/US | `1.234,56` e `1,234.56` aceitos como 1234.56 |
| campos contendo HTML/scripts | tratados como texto; renderização usa DOM seguro |
| tentativa de calcular sem animais | mensagem geral orienta adicionar animal |

## Responsividade

Validação real com Playwright + Edge headless.

### Viewport 360 px

```json
{
  "viewport": 360,
  "documentScrollWidth": 360,
  "bodyScrollWidth": 360,
  "tableClientWidth": 304,
  "tableScrollWidth": 700
}
```

Resultado:

- `document.documentElement.scrollWidth <= window.innerWidth`: aprovado.
- A rolagem horizontal ficou restrita a `.animal-table-wrap`: aprovado.
- O documento inteiro não gerou overflow horizontal: aprovado.

### Viewport 1280 px

```json
{
  "viewport": 1280,
  "documentScrollWidth": 1280,
  "bodyScrollWidth": 1280,
  "tableClientWidth": 779,
  "tableScrollWidth": 779
}
```

Resultado:

- Sem overflow horizontal no documento: aprovado.
- Tabela visível sem rolagem extra no desktop testado: aprovado.

## Romaneio/Impressão

Verificação por inspeção estática e comportamento da tela:

- não mostra botões e controles desnecessários no print: `@media print` oculta `.topbar`, `.input-panel`, `.secondary-button` e `.no-print`;
- exibe identificação da propriedade quando preenchida: `#report-property`;
- exibe data da pesagem: `#report-date`;
- exibe animais: `#report-list`;
- exibe peso total, médio, arrobas e valor estimado: `#total-weight`, `#average-weight`, `#total-arrobas`, `#estimated-value`;
- identifica rendimento utilizado: `#report-yield`;
- identifica preço por arroba: `#report-price`;
- informa que valores são estimativas: `#report-estimate-note`.

Status: aprovado por inspeção e comportamento. Não foi gerado PDF nesta sprint.

## Data Local

Correção aplicada:

- removido uso de `new Date().toISOString().slice(0, 10)`;
- criada função `localDateInputValue`, baseada em `getFullYear`, `getMonth` e `getDate`;
- teste automatizado cobre data local próxima do fim do dia: `new Date(2026, 6, 27, 23, 30, 0)` retorna `2026-07-27`.

Status: aprovado.

## Limitações Restantes

- Não há persistência.
- Não há banco de dados.
- Não há autenticação.
- Não há sincronização.
- Não há service worker.
- Não há modo offline real além da natureza estática da página já carregada.
- Não foi implementada demonstração separada de pastos; por decisão desta correção, o botão de demonstração da calculadora não injeta pastos fictícios.

