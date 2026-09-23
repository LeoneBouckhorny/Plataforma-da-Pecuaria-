# Modelo de Dados V2

Este documento atualiza o modelo local-first da Sprint 001 para incluir historico local de pesagens finalizadas. Ele nao introduz login, sincronizacao, banco remoto, PWA ou service worker.

## Principios

- Rascunho e historico finalizado sao dados diferentes.
- O rascunho representa a pesagem em andamento e pode ser alterado.
- A sessao finalizada representa um snapshot historico e nao deve mudar quando o rascunho for editado depois.
- O historico V2 continua armazenado apenas neste dispositivo.
- Identificadores internos sao estaveis e nao dependem de brinco.
- Brinco continua sendo campo operacional, nao chave primaria.
- Dados demo nao podem ser gravados como historico real.

## IndexedDB

Banco local:

- nome: `plataforma-pecuaria`;
- versao: `2`.

Object stores:

- `drafts`;
- `weighing-sessions`;
- `weighing-items`.

Indices:

- `weighing-items.sessionId`, com `unique: false`.

## Store `drafts`

Mantem somente a pesagem em andamento.

Chave:

- `key`.

Registro atual:

- `key`: obrigatorio, valor `calculator-current`;
- `schemaVersion`: obrigatorio, versao do draft;
- `updatedAt`: obrigatorio, data/hora ISO de atualizacao;
- `data`: obrigatorio, conteudo editavel do rascunho.

Regras:

- preservar valores invalidos para correcao posterior;
- preservar IDs temporarios das linhas;
- nao persistir dados demo;
- nao persistir DOM, HTML renderizado ou totais derivados;
- remover com `Limpar pesagem` ou `Nova pesagem`.

## Store `weighing-sessions`

Mantem as pesagens finalizadas.

Chave:

- `id`.

Campos:

- `id`: obrigatorio, identificador estavel da sessao;
- `schemaVersion`: obrigatorio, valor `2`;
- `createdAt`: obrigatorio, data/hora ISO da finalizacao;
- `weighingDate`: obrigatorio quando informado pelo produtor, preservado como snapshot;
- `accountId`: reservado, `null` na Sprint 002;
- `propertyId`: reservado, `null` na Sprint 002;
- `weighingName`: snapshot do nome da pesagem;
- `propertyNameSnapshot`: snapshot do nome da propriedade;
- `arrobaPriceSnapshot`: obrigatorio, preco numerico por arroba;
- `yieldRateSnapshot`: obrigatorio, rendimento numerico informado;
- `lightLimitSnapshot`: obrigatorio, limite da faixa leve;
- `mediumLimitSnapshot`: obrigatorio, limite da faixa media;
- `totalAnimals`: obrigatorio, quantidade final de animais validos;
- `totalWeight`: obrigatorio, peso total final;
- `averageWeight`: obrigatorio, peso medio final;
- `totalArrobas`: obrigatorio, arrobas estimadas finais;
- `estimatedValue`: obrigatorio, valor estimado final;
- `observations`: snapshot de observacoes da sessao;
- `status`: obrigatorio, valor `completed`.

Regras:

- gravar apenas sessoes validas;
- gravar em transacao atomica junto com seus itens;
- nao aceitar sessao sem itens;
- nao alterar uma sessao finalizada por mudancas futuras do rascunho.

## Store `weighing-items`

Mantem as linhas de animais de cada sessao finalizada.

Chave:

- `id`.

Campos:

- `id`: obrigatorio, identificador estavel do item;
- `sessionId`: obrigatorio, vinculo com `weighing-sessions.id`;
- `animalId`: reservado, `null` na Sprint 002;
- `tagSnapshot`: snapshot do brinco informado;
- `categorySnapshot`: obrigatorio, categoria no momento da pesagem;
- `weightSnapshot`: obrigatorio, peso vivo numerico;
- `noteSnapshot`: observacao do item;
- `weightBandSnapshot`: faixa calculada no momento da finalizacao;
- `arrobasSnapshot`: arrobas estimadas do item no momento da finalizacao.

Regras:

- buscar itens por indice `sessionId`;
- excluir itens da sessao na mesma transacao da exclusao da sessao;
- exibir `Sem brinco` quando `tagSnapshot` estiver vazio.

## Relacionamentos

- Uma sessao de pesagem possui muitos itens de pesagem.
- Cada item de pesagem pertence a exatamente uma sessao.
- `accountId`, `propertyId` e `animalId` ficam reservados para sincronizacao e gestao futura.
- Na Sprint 002, propriedade e animal individual sao snapshots textuais ou `null`.

## Campos Obrigatorios

Obrigatorios para finalizar:

- parametros validos de preco, rendimento e faixas;
- pelo menos um animal valido;
- peso vivo maior que zero em todos os animais presentes;
- nenhum brinco duplicado dentro da mesma sessao.

Obrigatorios no historico:

- `session.id`;
- `session.schemaVersion`;
- `session.createdAt`;
- `session.status`;
- totais derivados da sessao;
- `item.id`;
- `item.sessionId`;
- `item.weightSnapshot`;
- `item.categorySnapshot`.

## Identificadores Estaveis

Devem ser estaveis:

- `weighing-sessions.id`;
- `weighing-items.id`;
- IDs futuros de conta, propriedade, pasto, lote e animal.

IDs temporarios do rascunho ajudam a tela a manter as linhas estaveis, mas nao devem ser tratados como IDs historicos definitivos.

## Animais Sem Brinco

Animais sem brinco sao permitidos na calculadora e no historico local. A tela deve exibir `Sem brinco`, mas o snapshot deve preservar o valor vazio em `tagSnapshot`.

Futuramente, quando houver cadastro individual, um animal sem brinco devera receber `animalId` interno estavel. Esse ID interno sera a chave primaria real, permitindo trocar, remover ou corrigir brincos sem perder historico.

## Colisao de Brincos

Na Sprint 002, a validacao bloqueia brinco duplicado dentro da mesma sessao de pesagem.

No modelo futuro com propriedades e contas:

- brinco nao sera chave global;
- a unicidade operacional deve considerar `accountId + propertyId + brinco normalizado`;
- dois produtores ou duas propriedades diferentes poderao ter o mesmo brinco sem colisao de dados;
- relatorios devem sempre carregar o contexto da propriedade junto do brinco.

## Exclusao

A Sprint 002 faz exclusao fisica local da sessao e de todos os itens vinculados na mesma transacao IndexedDB. Sincronizacao futura devera reavaliar essa regra e provavelmente usar exclusao logica ou tombstones para evitar perda de dados entre dispositivos.
