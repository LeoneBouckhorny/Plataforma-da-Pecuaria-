# Backlog de Produto

Este backlog registra ideias aprovadas para acompanhamento futuro. Os itens abaixo nao foram implementados na Sprint 001.

## Epica Futura: Gestao de Arrendamentos e Parcerias

Objetivo futuro: permitir que o produtor registre corretamente relacoes entre terra, posse fisica do animal e participacao economica.

### Regime da Area

Requisitos futuros:

- propria;
- arrendada;
- cedida;
- parceria.

### Participacao Economica

Requisitos futuros:

- animal/lote a inteira;
- animal/lote a meia;
- percentuais personalizados.

### Base de Participacao

Requisitos futuros:

- faturamento bruto;
- lucro liquido.

### Despesas Abativeis no Lucro Liquido

Quando a base for lucro liquido, o sistema devera permitir configurar quais despesas entram no abatimento:

- aquisicao dos animais;
- arrendamento;
- suplementacao;
- vacinas;
- medicamentos;
- frete;
- comissao;
- mao de obra;
- outras despesas configuraveis.

### Separacao Conceitual Obrigatoria

Os seguintes conceitos sao diferentes e nao devem ser misturados no modelo de dados:

- posse fisica do animal;
- propriedade da terra;
- participacao economica.

Essa separacao deve orientar a modelagem futura antes de qualquer implementacao de arrendamento, parceria ou financeiro.
