# Modelo de Dados V0

Este documento define o modelo mínimo de dados para orientar as próximas sprints. Ele não implementa banco, persistência, sincronização ou migração.

## Princípios

- Todo dado salvo deve pertencer a uma conta ou organização.
- Dados de contas diferentes nunca podem ser misturados.
- Identificadores internos estáveis são as chaves principais; nomes, brincos e posições em tabela podem mudar.
- A calculadora gratuita pode funcionar como simulação não salva, sem propriedade obrigatória.
- Quando uma pesagem for salva na gestão, ela deve estar vinculada ao contexto da conta e da propriedade.
- Dados históricos de pesagem devem guardar snapshots do momento do lançamento, mesmo que o animal seja editado depois.

## Entidades

### Conta ou organização

Representa o contexto do usuário, família, fazenda ou empresa que possui os dados.

| Campo | Obrigatório | Observação |
| --- | --- | --- |
| identificador estável | Sim | ID interno estável da conta. |
| nome | Sim | Nome da conta, organização ou responsável. |
| status | Sim | Ex.: ativa, suspensa, arquivada. |
| data de criação | Sim | Data local/servidor em que a conta foi criada. |

### Propriedade

Representa uma fazenda, sítio ou área de manejo do produtor.

| Campo | Obrigatório | Observação |
| --- | --- | --- |
| identificador | Sim | ID interno estável da propriedade. |
| conta | Sim | Referência obrigatória à conta dona da propriedade. |
| nome | Sim | Nome usado pelo produtor. |
| município | Não | Localização administrativa. |
| estado | Não | UF da propriedade. |
| observações | Não | Texto livre. |

### Pasto ou piquete

Representa uma divisão opcional dentro da propriedade.

| Campo | Obrigatório | Observação |
| --- | --- | --- |
| identificador | Sim | ID interno estável do pasto/piquete. |
| propriedade | Sim | Referência à propriedade dona do pasto. |
| nome | Sim | Nome usado no manejo. |
| lotação máxima opcional | Não | Limite informado pelo produtor. Unidade futura: animais, UA ou ambos. |
| observações | Não | Texto livre. |

### Lote

Agrupa animais para manejo e pesagem.

| Campo | Obrigatório | Observação |
| --- | --- | --- |
| identificador | Sim | ID interno estável do lote. |
| propriedade | Sim | Referência à propriedade. |
| pasto opcional | Não | Referência ao pasto atual, quando a propriedade usa pastos. |
| nome | Sim | Nome do lote. |
| categoria | Não | Ex.: boi, vaca, novilha, bezerro, recria, engorda. |
| status | Sim | Ex.: ativo, vendido, encerrado, arquivado. |

### Animal

Representa um animal individual quando o produtor usa cadastro detalhado.

| Campo | Obrigatório | Observação |
| --- | --- | --- |
| identificador interno | Sim | ID interno estável do animal e chave principal. |
| propriedade | Sim | Referência obrigatória à propriedade atual do animal. |
| brinco | Não | Pode não existir ou ainda não ter sido informado. |
| categoria | Não | Ex.: boi, vaca, novilha, bezerro. |
| lote opcional | Não | Referência ao lote atual. |
| observações | Não | Texto livre. |

O brinco não é chave principal. Quando existir, sua unicidade deve ser avaliada por `propriedade + brinco`.

### Sessão de pesagem

Representa uma pesagem feita em uma data, com parâmetros de cálculo.

| Campo | Obrigatório | Observação |
| --- | --- | --- |
| identificador | Sim | ID interno estável da sessão. |
| conta | Condicional | Obrigatória quando a sessão for salva na gestão. |
| propriedade | Condicional | Opcional em simulação gratuita não salva; obrigatória quando a sessão for salva. |
| lote opcional | Não | Referência ao lote pesado, quando houver. |
| data | Sim | Data da pesagem. |
| preço por arroba | Sim | Valor informado pelo usuário para estimativa. |
| rendimento informado | Sim | Percentual usado no cálculo de arrobas. |
| observações | Não | Texto livre. |

Na calculadora gratuita, a sessão pode existir apenas em memória, sem conta ou propriedade. Na gestão, conta e propriedade passam a ser obrigatórias para isolamento e histórico.

### Item de pesagem

Representa um animal ou linha dentro de uma sessão de pesagem.

| Campo | Obrigatório | Observação |
| --- | --- | --- |
| identificador | Sim | ID interno estável do item e identificador da linha. |
| sessão de pesagem | Sim | Referência à sessão. |
| animal_id opcional | Não | Referência ao animal cadastrado, quando existir. |
| brinco informado ou snapshot opcional | Não | Texto informado no momento da pesagem, mesmo sem animal cadastrado. |
| peso vivo | Sim | Peso informado na pesagem. |
| categoria no momento da pesagem | Não | Snapshot da categoria no momento da pesagem. |
| observação | Não | Texto livre do item. |

Na calculadora gratuita:

- `animal_id` pode ser nulo;
- brinco pode ser nulo;
- o identificador do item mantém a linha identificável.

## Relacionamentos

- Uma conta possui uma ou várias propriedades.
- Uma propriedade pertence a uma única conta.
- Uma propriedade pode ter zero ou muitos pastos/piquetes.
- Uma propriedade pode ter zero ou muitos lotes.
- Um pasto pertence a uma única propriedade.
- Um lote pertence a uma única propriedade.
- Um lote pode estar vinculado a um pasto, mas isso é opcional.
- Um animal pertence a uma propriedade atual.
- Um animal pode estar vinculado a um lote, mas isso é opcional.
- Uma sessão de pesagem salva pertence a uma conta e a uma propriedade.
- Uma sessão de pesagem pode estar vinculada a um lote, mas isso é opcional.
- Uma sessão de pesagem possui um ou muitos itens de pesagem.
- Um item de pesagem pertence a uma única sessão.
- Um item de pesagem pode referenciar um animal cadastrado ou apenas guardar o brinco/snapshot informado.

## Isolamento Multiusuário

Todo acesso futuro aos dados deve partir do contexto da conta. Consultas, relatórios, exportações e sincronização não podem misturar:

- propriedades de contas diferentes;
- animais de contas diferentes;
- sessões de pesagem de contas diferentes;
- lotes ou pastos de propriedades fora da conta ativa.

Na futura sincronização, a conta será o limite primário de isolamento.

## Movimentação de Animal

Movimentar um animal entre pastos, lotes ou propriedades da mesma conta não deve trocar seu identificador interno. O histórico permanece ligado ao mesmo animal.

Se um animal mudar de propriedade, o campo de propriedade atual pode mudar, mas os eventos antigos devem manter snapshots da propriedade/lote/pasto do momento em que ocorreram.

## Dados Atuais vs. Snapshots Históricos

O cadastro do animal guarda o dado atual, como categoria, lote, propriedade e brinco atual.

O item de pesagem guarda o dado registrado naquele momento, como:

- brinco informado;
- categoria no momento da pesagem;
- peso vivo informado;
- observação;
- parâmetros da sessão usados no cálculo.

Isso evita que uma alteração posterior no animal reescreva o histórico.

## Animais Sem Brinco

Animais sem brinco devem ser permitidos como casos temporários. O sistema deve:

- criar ou manter um identificador interno estável;
- exibir o animal como "sem brinco";
- permitir observação descritiva;
- permitir informar ou corrigir o brinco depois;
- preservar o histórico já lançado quando o brinco for preenchido.

Na calculadora gratuita, uma linha sem brinco pode ser calculada, desde que tenha peso válido.

## Brincos Iguais Em Propriedades Diferentes

O brinco não deve ser tratado como identificador global. Para evitar colisão:

- a unicidade do brinco deve ser avaliada dentro da propriedade;
- o identificador interno do animal deve ser a chave principal;
- buscas e relatórios devem considerar propriedade + brinco;
- importações futuras devem tratar brinco duplicado como conflito dentro da mesma propriedade, não entre propriedades diferentes.

Na mesma sessão de pesagem, brincos duplicados devem gerar alerta ou erro para evitar lançamento repetido acidental.

