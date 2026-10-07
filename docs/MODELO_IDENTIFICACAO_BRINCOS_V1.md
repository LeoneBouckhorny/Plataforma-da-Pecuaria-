# Modelo de Identificacao de Brincos V1

## Lote

| Campo | Regra |
| --- | --- |
| id | UUID estavel; nao deriva de nome/codigo |
| accountId / propertyId | Escopo real, obrigatorio e imutavel |
| tagSuffix | Uma letra A-Z, trim + uppercase; obrigatoria na criacao |
| lotes anteriores | Campo ausente/null aceito; sem letra atribuida automaticamente |

Suffix unico por propriedade, incluindo arquivados. Antes de emitir codigos pode
ser corrigido; apos emissao, tagOriginLotId de qualquer animal bloqueia alteracao.
Propriedades diferentes podem usar a mesma letra. Arquivar nao libera suffix.

## Animal Padronizado

```json
{
  "id": "UUID-do-animal",
  "accountId": "UUID-da-operacao",
  "propertyId": "UUID-da-propriedade",
  "lotId": "UUID-do-lote-atual-B",
  "tagNumber": "0023",
  "tagSuffix": "A",
  "tag": "0023A",
  "tagOriginLotId": "UUID-do-lote-de-origem-A"
}
```

- Entrada numerica: apenas 1..9999, ate quatro digitos; espacos externos removidos.
- 1 -> 0001; 23 -> 0023; 287 -> 0287; 9999 -> 9999.
- Rejeita zero, 0000, negativos, decimais, notacao exponencial, letras e mais de quatro digitos.
- Emissao exige lote ativo da mesma operacao/propriedade com suffix configurado.
- Repository deriva suffix/origem/tag; o cliente nao pode forjar esses campos.
- Codigo completo unico no escopo, trim/uppercase, incluindo arquivados e legados.
- Correcao de tagNumber preserva UUID, tagSuffix e tagOriginLotId e verifica conflito.
- Mudanca de lotId nao altera codigo nem origem; evento segue modelo V5.
- tagOriginLotId nao representa localizacao; pasto continua derivado do lote atual.

## Sem Brinco e Legado

Animal pode possuir somente name; lotId e opcional. A identificacao por UUID nao
depende de tag. Animal sem brinco pode receber emissao explicita conforme o lote
atual ativo/configurado, mas um brinco legado existente nao e convertido.

Tags anteriores permanecem como estavam. Ausencia de tagNumber/tagSuffix/
tagOriginLotId e aceita na leitura. Nenhuma migration inventa suffix ou troca
tag. Lotes antigos sem suffix exibem Codigo de brinco nao configurado.
Atualizacoes sem alteracao de tag nao tentam corrigir duplicados preexistentes.

## Historico e Persistencia

weighing-item.animalId continua UUID ou null; nunca inferido por coincidencia de
tag. animalTagSnapshot guarda o codigo no momento da finalizacao. Corrigir numero
ou mover animal nao altera snapshot anterior. Nenhuma store/indice foi criada;
DB_VERSION continua 5. Novos campos sao aditivos nos objetos existentes.

As verificacoes de unicidade e bloqueio ocorrem na mesma transacao da escrita.
Falha na gravacao aborta estado/evento; nao ha salvamento parcial.
