# ADR 004 - Operacao Local e Multiplas Propriedades

## Status

Aceita para a Sprint 004.

## Contexto

A Plataforma da Pecuaria precisa permitir que um produtor organize pesagens por diferentes propriedades sem depender de login, senha, nuvem ou sinal de internet no curral.

O sistema ja possuia rascunho, historico local e PWA offline. Faltava uma estrutura estavel para vincular pesagens a propriedades sem usar texto como chave.

## Decisao

Criar uma operacao local e propriedades persistidas no IndexedDB.

Stores adicionadas:

- `accounts`;
- `properties`;
- `app-settings`.

O banco evolui de `DB_VERSION = 2` para `DB_VERSION = 3`.

## Operacao Local Nao E Autenticacao

A operacao local representa apenas a organizacao dos dados neste dispositivo.

Ela nao significa:

- usuario autenticado;
- login;
- senha;
- e-mail;
- conta na nuvem;
- assinatura;
- sincronizacao.

Na interface, a linguagem usa `Minha operacao` e `Operacao`, evitando sugerir conta online.

## IDs Estaveis

Conta/operação e propriedades usam IDs estaveis gerados localmente.

Preferencia:

- `crypto.randomUUID()` quando disponivel;
- fallback local somente quando necessario.

IDs nao dependem de:

- nome da operacao;
- nome da propriedade;
- municipio;
- UF;
- brinco de animal.

Isso evita colisao quando propriedades tiverem nomes iguais ou forem renomeadas.

## App Settings

`app-settings` guarda inicialmente apenas:

```text
active-account-id
```

Esse valor aponta para a operacao local ativa.

A store nao deve virar armazenamento generico de dados do produtor.

## Isolamento Por AccountId

Toda propriedade possui `accountId`.

Consultas do `PropertyRepository` exigem `accountId` e nao retornam propriedades de outra operacao quando o ID da operacao e informado.

Na Sprint 004 existe apenas uma operacao local ativa, mas a regra prepara o caminho para conta real no futuro.

## Arquivamento Em Vez De Exclusao

Propriedades nao sao excluidas definitivamente nesta sprint.

Acoes permitidas:

- arquivar;
- reativar.

Ao arquivar:

- o ID permanece;
- o cadastro permanece;
- historicos permanecem;
- snapshots permanecem.

Propriedade arquivada deixa de aparecer normalmente para nova pesagem, mas continua disponivel em filtros quando possui historico.

## Snapshots Historicos

Pesagens finalizadas gravam:

- `accountId`;
- `propertyId`;
- `propertyNameSnapshot`.

`propertyId` vincula a sessao ao cadastro real.

`propertyNameSnapshot` preserva o nome exibido no momento da finalizacao.

Se a propriedade `Boa Vista` for renomeada para `Boa Vista - Unidade Principal`, uma pesagem antiga continua exibindo `Boa Vista`.

## Compatibilidade Com Dados Antigos

Drafts antigos sem `accountId` e `propertyId` continuam validos.

Ao restaurar um draft legado:

- `accountId` pode receber a operacao local ativa;
- `propertyId` permanece `null`;
- `propertyName` textual e preservado;
- nao ha tentativa de adivinhar propriedade por nome.

Sessoes antigas com `propertyId = null` permanecem como `Sem vinculo`.

## PWA E Cache

Como novos modulos JavaScript entraram no app shell, o Service Worker passa de:

```text
plataforma-pecuaria-shell-v1
```

para:

```text
plataforma-pecuaria-shell-v2
```

Regras preservadas:

- sem `skipWaiting()` automatico;
- sem reload forcado;
- limpeza seletiva apenas de caches com prefixo da aplicacao;
- IndexedDB nunca e apagado pelo Service Worker;
- fetch continua limitado a `GET`, same-origin e recursos conhecidos do app shell.

## Integracao Futura Com Nuvem

A operacao local cria uma ponte para conta remota futura.

Quando houver backend, a arquitetura devera definir:

- associacao segura entre operacao local e conta autenticada;
- estrategia de merge entre dados locais e remotos;
- backup;
- resolucao de conflitos;
- preservacao dos IDs locais ou mapeamento auditavel.

Essa integracao nao foi implementada na Sprint 004.

## Consequencias

Beneficios:

- multiplas propriedades sem misturar historico;
- filtro por propriedade usando ID;
- renomeacao segura via snapshot;
- base para pastos, lotes, animais e sincronizacao futura.

Riscos:

- dados continuam locais e dependem do navegador/dispositivo;
- ainda nao existe backup;
- uma futura conta na nuvem precisara tratar migracao e conflito com cuidado.
