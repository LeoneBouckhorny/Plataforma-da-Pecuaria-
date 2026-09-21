# Backlog de Produto

Este backlog registra ideias aprovadas para acompanhamento futuro. Os itens abaixo nao foram implementados na Sprint 001.

## Observacao Comercial Pos-Sprint 002

- O historico de pesagens podera ser recurso Premium no modelo comercial futuro.
- Durante MVP, beta, validacao e QA, o historico local pode permanecer liberado para reduzir atrito e coletar feedback real.
- Nenhum paywall deve ser implementado sem decisao explicita do CTO e do CEO.

## Backlog Tecnico Pos-Sprint 003

- UX de nova versao disponivel para Service Worker.
- Armazenamento persistente quando o navegador oferecer suporte.
- Estrategia de backup local/remoto.
- Sincronizacao futura entre dispositivos.
- Manual especifico para instalacao em iOS, se necessario.
- Telemetria futura com privacidade e decisao explicita de produto.
- Estrategia de recuperacao de dados para perda, troca ou limpeza de aparelho.

## Backlog Pos-Sprint 004

- Cadastro definitivo de pastos/piquetes vinculados a propriedade.
- Cadastro de lotes/rebanhos por propriedade e pasto.
- Cadastro individual de animais com ID interno estavel.
- Movimentacao de animais entre propriedades, pastos e lotes.
- Conversao futura de operacao local em conta na nuvem, sem perder IDs locais.
- Estrategia de conflito para sincronizacao futura entre celular e computador.

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
