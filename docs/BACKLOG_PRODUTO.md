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

## Atualizacao Pos-Sprint 006

Pastos/piquetes, lotes e animais individuais agora possuem cadastro local.
A mudanca de pasto do lote e de lote do animal representa somente estado atual.
Os itens de cadastro listados no backlog pos-Sprint 004 foram atendidos nesta
entrega, sujeita a auditoria do CTO. Permanecem futuros:

- Transferencia formal entre propriedades.
- Historico de movimentacoes, com eventos de entrada/saida.
- Pesagem individual vinculada explicitamente ao animal, sem inferencia por brinco.
- Sanidade, vacinas, medicamentos e reproducao.
- Compra, venda, morte, nascimento e castracao como eventos proprios.
- Arrendamento, parceria e boi a meia/inteira.
- Capacidade/lotacao de pastagem e UA/ha.
- Sincronizacao, backup e recuperacao.

## Atualizacao Pos-Sprint 007

Ficha individual, eventos administrativos, observacoes e pesagens explicitamente
vinculadas entregues para auditoria. Ultimo peso e timeline sao derivados.
Mudanca de lote do animal registra historico; mudanca de pasto do lote ainda
representa somente estado atual. Permanecem futuros, sem implementacao:

- Associacao manual retroativa de pesagens antigas, com auditoria propria.
- Historico de movimentacao do lote entre pastos.
- GMD, curva de crescimento e graficos de peso.
- Compra, venda, morte, nascimento formal e castracao.
- Sanidade, medicamentos, vacinacao e reproducao.
- Transferencia formal entre propriedades.
- Importacao em massa, RFID e integracao com balanca.
- Nuvem, sincronizacao e backup/recuperacao.
- Medicao de escala para busca/paginacao/virtualizacao, sem antecipar complexidade.

## Atualizacao Pos-Sprint 008

Entregues para auditoria: gestao contextual por propriedade, contadores derivados,
rebanho e pesagens contextuais, identificacao padronizada por lote de origem.
Continuam apenas como propostas, sem implementacao:

- Conversao manual de brinco legado para o padrao, com revisao explicita de conflitos.
- Tratamento de conflitos de identificacao em futura transferencia entre propriedades.
- Possivel expansao de suffix alem de A-Z, com requisitos proprios.
- Impressao de etiquetas/brincos fisicos.
- Importacao em massa.
- RFID e integracao com balanca.

## Atualizacao Pos-Sprint 009

Entregues para auditoria: hierarquia Pasto -> Lote -> Animal e cadastro rapido
opcional somente durante a criacao de um novo lote. Categorias e racas multiplas
nao implicam classificacoes individuais arbitrarias. Permanecem futuros:

- Adicionar varios animais a um lote existente, com confirmacao e atomicidade proprias.
- Importacao CSV e planilhas, com validacao e previa de conflitos.
- Edicao em massa de animais.
- Transferencia formal entre propriedades, resolvendo identificacoes conflitantes.
- Impressao de etiquetas/brincos, RFID e integracao com balancas.
- Filtros avancados e medicao de escala antes de paginacao/virtualizacao.
- Homologacao de grandes volumes no Android fisico antes de prometer capacidade.

Nenhum desses itens foi implementado nesta Sprint. Sprint 010 nao iniciada.

## Epica Futura: Gestao de Arrendamentos e Parcerias (Requisitos)

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
