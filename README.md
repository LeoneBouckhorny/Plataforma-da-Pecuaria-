# Plataforma da Pecuaria

Base inicial da Plataforma da Pecuaria, com foco em uma porta de entrada simples para o produtor rural: uma calculadora de pesagem que estima peso, arrobas e valor do lote.

## Direcao do produto

- Resolver uma dor imediata antes de vender gestao.
- Manter o plano gratuito util de verdade.
- Apresentar o plano pago sem pressao.
- Funcionar bem no celular.
- Construir a base local-first antes de qualquer sincronizacao futura.
- Usar benchmarks de mercado apenas para entender fluxos e superar a experiencia, sem copiar produto.

## MVP gratuito

- Calculadora de pesagem por animal/lote.
- Cotacao regional por arroba.
- Rendimento de carcaca configuravel.
- Valor estimado do lote.
- Separacao visual por faixas de peso.
- Romaneio V1 para impressao.
- Exportacao CSV com UTF-8 BOM e separador ponto e virgula.
- Rascunho da pesagem atual preservado neste dispositivo com IndexedDB.
- Historico local de pesagens finalizadas neste dispositivo.

## Persistencia local

A aplicacao preserva uma pesagem em andamento no mesmo dispositivo. Ao fechar ou recarregar a pagina, o rascunho real mais recente pode ser restaurado.

Essa persistencia local nao significa:

- PWA;
- cache offline completo da aplicacao;
- sincronizacao em nuvem;
- login;
- backup remoto.

Dados de demonstracao nao sao persistidos. O botao `Limpar pesagem` remove o rascunho local `calculator-current` e restaura a tela vazia com os parametros padrao.

Na Sprint 002, a aplicacao tambem salva sessoes finalizadas em historico local. Esse historico usa snapshots e nao muda quando o rascunho atual e editado depois. O historico ainda fica somente no dispositivo e nao substitui backup, conta ou sincronizacao.

## Gestao premium futura

- Propriedades.
- Pastos/piquetes opcionais por propriedade.
- Lotacao maxima opcional por pasto.
- Lotes e animais individuais.
- Historico de peso.
- Vacinas, reproducao, nascimento, castracao, compra, venda e mortalidade.
- Movimentacao entre propriedades e pastos.
- Despesas e permissoes para funcionarios.

## Como abrir para desenvolvimento

Para QA da persistencia local, prefira servir o projeto via servidor local ou Live Preview. Exemplo:

```powershell
python -m http.server 8026 --bind 127.0.0.1
```

Depois acesse:

```text
http://127.0.0.1:8026/index.html
```

Abrir o HTML diretamente pode funcionar para leitura visual, mas o teste de IndexedDB deve ser feito em um contexto de navegador servido localmente.

## Testes

Execute a checagem de sintaxe:

```powershell
node --check app.js
node --check src/calculator-core.js
node --check src/local-data-core.js
node --check src/local-database.js
node --check src/draft-repository.js
node --check src/weighing-history-core.js
node --check src/weighing-repository.js
node --check src/csv-export-core.js
```

Execute os testes automatizados:

```powershell
node --test tests/calculator-core.test.js tests/local-data-core.test.js tests/draft-repository.test.js tests/local-database-migration.test.js tests/weighing-history-core.test.js tests/csv-export-core.test.js tests/weighing-repository.test.js
```
