# Base do Produto

Este documento registra as decisoes iniciais que devem guiar o projeto.

## Publico

O sistema deve falar com produtor rural pequeno ou tradicional, muitas vezes acostumado com caderno, WhatsApp e planilhas simples. A comunicacao precisa ser direta, pratica e sem linguagem tecnica desnecessaria.

## Posicionamento

O produto nao deve comecar sendo vendido como "software de gestao". A primeira promessa deve ser:

> Em poucos segundos voce sabe quanto seu gado esta pesando e quanto pode valer.

O produtor compra tempo, clareza e dinheiro economizado. Tecnologia e apenas o meio.

## Modelo freemium

O plano gratuito deve resolver uma dor real: calculadora de pesagem, valor estimado do lote e romaneio simples.

O plano pago deve existir desde o inicio, mas sem pressao. Ele pode aparecer em contexto, por exemplo:

- "Com historico, voce veria a evolucao desde a ultima pesagem."
- "No premium, este lote poderia ficar salvo dentro da propriedade."
- "Com gestao completa, voce acompanha vacinas, nascimento, venda e movimentacao."

## Gestao de propriedades e pastos

Uma conta pode ter varias propriedades.

Cada propriedade pode funcionar de duas formas:

1. Sem divisao por pastos: animais e lotes ficam vinculados diretamente a propriedade.
2. Com pastos/piquetes: o produtor cadastra pastos apenas se quiser controle mais detalhado.

Pastos devem ser opcionais para nao criar barreira para quem quer apenas comecar rapido.

Quando um pasto existir, ele pode ter:

- Nome.
- Area ou descricao, opcional no futuro.
- Lotacao maxima opcional.
- Unidade da lotacao a definir: numero de animais, UA ou ambos em uma etapa futura.

No futuro, o sistema pode alertar quando a lotacao atual passar do limite configurado.

## Benchmark

A LeiloApp/Calculadora de Pesagem deve ser usada como benchmark funcional. Pontos observados:

- Funcionamento offline.
- Peso e brinco.
- Pesagem simples ou com valores.
- Separacao por faixa de peso.
- Calculo de apartes.
- Romaneio.
- Exportacao.
- GMD por brinco.
- Graficos e filtros.
- Organizacao por pastas.
- Localizacao da pesagem.

O objetivo nao e copiar, mas criar uma experiencia mais simples na entrada e mais completa na gestao.

