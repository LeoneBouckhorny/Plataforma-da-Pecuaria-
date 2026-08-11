# Modelo de Dados V1

Este documento preserva o modelo conceitual da Sprint 000 e acrescenta a camada de persistencia local introduzida na Sprint 001. Ele nao implementa autenticacao, sincronizacao, historico completo ou banco remoto.

## Principios

- Todo dado historico futuro deve pertencer a uma conta ou organizacao.
- Dados de contas diferentes nunca podem ser misturados.
- Identificadores internos estaveis sao as chaves principais.
- Brinco nao e chave primaria.
- A calculadora gratuita pode manter um draft local sem conta autenticada.
- Resultados derivados devem ser recalculados pelo `CalculatorCore`.
- Eventos historicos devem guardar snapshots do momento do lancamento.

## Entidades Conceituais Preservadas

### Conta ou Organizacao

Representa o contexto do usuario, familia, fazenda ou empresa que possui os dados.

Campos principais:

- identificador estavel;
- nome;
- status;
- data de criacao.

### Propriedade

Representa uma fazenda, sitio ou area de manejo.

Campos principais:

- identificador estavel;
- conta;
- nome;
- municipio;
- estado;
- observacoes.

### Pasto ou Piquete

Representa uma divisao opcional dentro da propriedade.

Campos principais:

- identificador estavel;
- propriedade;
- nome;
- lotacao maxima opcional;
- observacoes.

### Lote

Agrupa animais para manejo e pesagem.

Campos principais:

- identificador estavel;
- propriedade;
- pasto opcional;
- nome;
- categoria;
- status.

### Animal

Representa um animal individual quando o produtor usa cadastro detalhado.

Campos principais:

- identificador interno estavel;
- propriedade atual;
- brinco opcional;
- categoria;
- lote opcional;
- observacoes.

O identificador interno nao deve mudar quando o animal for movimentado entre pastos, lotes ou propriedades da mesma conta. Quando houver brinco, sua unicidade deve ser avaliada por `propriedade + brinco`.

### Sessao de Pesagem

Representa uma pesagem feita em uma data, com parametros de calculo.

Campos principais:

- identificador estavel;
- conta, quando salva na gestao;
- propriedade, quando salva na gestao;
- lote opcional;
- data;
- preco por arroba;
- rendimento informado;
- observacoes.

### Item de Pesagem

Representa uma linha dentro de uma sessao de pesagem.

Campos principais:

- identificador estavel;
- sessao de pesagem;
- animal_id opcional;
- brinco informado ou snapshot;
- peso vivo;
- categoria no momento da pesagem;
- observacao.

Na calculadora gratuita, `animal_id` pode ser nulo, o brinco pode ser vazio e o identificador do item mantem a linha estavel.

## Persistencia Local e Sincronizacao Futura

Na Sprint 001, a persistencia local existe apenas para preservar a pesagem em andamento no mesmo dispositivo. O draft local nao e registro historico definitivo.

O draft pode existir sem conta autenticada porque a calculadora gratuita ainda nao tem login. Esse comportamento permite que o produtor recarregue a pagina sem perder a pesagem em andamento.

Formato conceitual do draft:

```json
{
  "key": "calculator-current",
  "schemaVersion": 1,
  "updatedAt": "...",
  "data": {
    "weighingName": "",
    "weighingDate": "",
    "propertyName": "",
    "settings": {
      "arrobaPrice": "300,00",
      "yieldRate": "50",
      "lightLimit": "300",
      "mediumLimit": "420"
    },
    "animals": [],
    "usePaddocks": false,
    "paddocks": []
  }
}
```

Regras do draft local:

- nao persistir HTML renderizado;
- nao persistir elementos DOM;
- nao persistir peso total, media, arrobas ou valor estimado;
- preservar IDs temporarios de linhas e pastos;
- preservar valores digitados, mesmo quando ainda invalidos;
- ignorar dados de demonstracao;
- remover o draft no comando `Limpar pesagem`.

Dados historicos futuros deverao possuir IDs estaveis proprios. Esses IDs nao poderao mudar apos sincronizacao.

Timestamps serao necessarios para:

- criacao;
- alteracao;
- exclusao logica;
- resolucao futura de conflitos;
- auditoria de sincronizacao.

Exclusoes futuras deverao considerar tombstones ou soft delete para evitar que uma remocao offline seja perdida durante sincronizacao posterior.

A sincronizacao ainda nao esta implementada nesta sprint. O IndexedDB V1 prepara a base local, mas nao define protocolo de nuvem, resolucao de conflitos, autenticacao ou multi-dispositivo.

## Isolamento Futuro

Quando houver autenticacao e conta, todo acesso aos dados devera partir do contexto da conta ativa. Consultas, relatorios, exportacoes e sincronizacao nao poderao misturar:

- propriedades de contas diferentes;
- animais de contas diferentes;
- sessoes de pesagem de contas diferentes;
- lotes ou pastos de propriedades fora da conta ativa.

O draft local da calculadora e uma excecao temporaria porque ainda pode existir antes de login. Ao ser convertido futuramente em registro historico, devera receber conta, propriedade e IDs estaveis definitivos.
