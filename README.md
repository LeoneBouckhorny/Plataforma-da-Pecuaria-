# Plataforma da Pecuaria

Primeira base do projeto para validar uma plataforma simples de apoio ao produtor rural.

O foco inicial e a porta de entrada gratuita e direta: uma calculadora de pesagem que ajuda o produtor a estimar rapidamente peso, arrobas e valor do gado, sem exigir que ele adote um sistema completo logo no primeiro contato.

## Direcao do produto

- Resolver uma dor imediata antes de vender gestao.
- Manter o plano gratuito util de verdade.
- Apresentar o plano pago sem pressao.
- Funcionar bem no celular e, no futuro, tambem offline com sincronizacao.
- Usar benchmarks de mercado apenas para entender fluxos e superar a experiencia, sem copiar produto.

## MVP gratuito

- Calculadora de pesagem por animal/lote.
- Cotacao regional por arroba.
- Rendimento de carcaca configuravel.
- Valor estimado do lote.
- Separacao visual por faixas de peso.
- Romaneio simples para impressao/exportacao.

## Gestao premium futura

- Propriedades.
- Pastos/piquetes opcionais por propriedade.
- Lotacao maxima opcional por pasto.
- Lotes e animais individuais.
- Historico de peso.
- Vacinas, reproducao, nascimento, castracao, compra, venda e mortalidade.
- Movimentacao entre propriedades e pastos.
- Despesas e permissoes para funcionarios.

## Como abrir

Abra [index.html](./index.html) no navegador.

A aplicação inicia sem animais cadastrados. Use `Carregar dados de exemplo` apenas para testar o fluxo com dados fictícios, ou use o botão `+` para montar uma pesagem real manualmente.

## Observações da Sprint 000

- Não há banco de dados, login, sincronização ou persistência local nesta etapa.
- A calculadora usa dados apenas em memória.
- O botão `Limpar pesagem` remove todos os animais informados na pesagem atual.

## Testes

Execute:

```powershell
node --test tests/calculator-core.test.js
```
