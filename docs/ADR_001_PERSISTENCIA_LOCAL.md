# ADR 001 - Persistencia Local

## Status

Aprovada para implementacao na Sprint 001.

## Contexto

A calculadora da Sprint 000 funcionava apenas em memoria. Ao recarregar ou fechar a pagina, a pesagem em andamento era perdida.

O produto precisa evoluir para uma base local-first, adequada ao uso no campo, onde a conexao pode ser instavel e o produtor nao deve perder o lancamento em andamento.

## Decisao

Usar IndexedDB como mecanismo principal de persistencia local para o draft da calculadora.

Banco:

- nome: `plataforma-pecuaria`;
- versao: `1`;
- store: `drafts`;
- chave: `key`;
- draft principal: `calculator-current`.

A implementacao usa apenas APIs nativas do navegador, sem frameworks e sem dependencias npm.

## Por Que Nao localStorage

`localStorage` nao foi escolhido como armazenamento principal porque:

- e sincrono;
- bloqueia a thread principal em escritas maiores;
- nao oferece transacoes;
- escala mal para estruturas futuras com muitos animais e eventos;
- nao e uma boa base para migracoes e sincronizacao futura.

## Separacao de Responsabilidades

- `src/calculator-core.js`: calculo puro e validacoes.
- `src/local-data-core.js`: schema, normalizacao, serializacao e validacao estrutural.
- `src/local-database.js`: adapter exclusivo de IndexedDB.
- `src/draft-repository.js`: operacoes de draft da pesagem atual.
- `app.js`: interface, eventos, renderizacao e integracao.

A interface nao conhece detalhes internos do IndexedDB.

## Versionamento e Migracoes

O banco local inicia na versao 1.

A funcao de migration segue o formato sequencial:

```js
if (oldVersion < 1) {
  criar stores da versao 1;
}
```

Versoes futuras deverao acrescentar blocos sequenciais sem reescrever dados existentes de forma destrutiva.

## Tratamento de Falhas

Se IndexedDB estiver indisponivel ou falhar:

- a calculadora continua funcionando em memoria;
- os calculos seguem operacionais;
- a interface mostra aviso discreto;
- o sistema nao informa salvamento quando ele falha;
- nenhum erro de persistencia bloqueia a pesagem.

## Modo Demonstracao

Dados de demonstracao nao sao elegiveis para persistencia.

Quando `demoMode === true`, o autosave e ignorado. Assim, um draft real salvo anteriormente nao e substituido por registros ficticios como `EX-001` e `EX-002`.

## Caminho Futuro

Esta decisao prepara a base para:

- historico completo;
- operacao offline mais ampla;
- sincronizacao futura;
- resolucao de conflitos;
- autenticacao;
- multi-dispositivo.

Essas capacidades nao foram implementadas na Sprint 001.
