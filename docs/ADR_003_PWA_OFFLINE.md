# ADR 003 - PWA e Funcionamento Offline

## Status

Aceita para a Sprint 003.

## Problema

A Plataforma da Pecuaria precisa funcionar no curral mesmo quando o produtor fica sem sinal de internet depois do primeiro acesso online.

O requisito desta sprint e permitir que os arquivos essenciais da aplicacao sejam carregados uma vez, armazenados no navegador e reutilizados offline. Os dados continuam sendo locais e gravados no IndexedDB existente.

## Decisao

Transformar a aplicacao em PWA usando apenas recursos nativos:

- Web App Manifest;
- Service Worker;
- Cache Storage API;
- IndexedDB ja existente;
- eventos `online` e `offline`;
- evento `beforeinstallprompt` quando suportado pelo navegador.

Nao foram adicionados frameworks, Workbox, bibliotecas, CDN, backend, login, sincronizacao, notificacoes ou Background Sync.

## Manifest

O arquivo `manifest.webmanifest` define:

- `id`, `start_url` e `scope` relativos ao escopo;
- `display: standalone`;
- `orientation: any`;
- `lang: pt-BR`;
- `theme_color` e `background_color` alinhados ao tema atual;
- icones `any` e `maskable`.

Os caminhos usam `./` para permitir hospedagem futura em subdiretorio.

## Service Worker

O arquivo `sw.js` usa cache versionado:

```text
plataforma-pecuaria-shell-v1
```

A versao fica concentrada em `CACHE_VERSION`. O prefixo `plataforma-pecuaria-shell-` limita a limpeza de caches antigos aos caches desta aplicacao.

Nao ha `skipWaiting()` automatico nesta sprint. Isso evita ativar uma nova versao no meio de uma sessao aberta e misturar arquivos de versoes diferentes.

## Separacao de Responsabilidades

Cache Storage guarda somente arquivos essenciais do app shell.

IndexedDB continua guardando somente dados locais:

- drafts;
- sessoes de pesagem;
- itens de pesagem.

O Service Worker nao le, copia, migra ou apaga dados do IndexedDB.

## App Shell

O precache inclui:

- `./`;
- `./index.html`;
- `./styles.css`;
- `./app.js`;
- `./manifest.webmanifest`;
- modulos JavaScript usados pela aplicacao;
- controlador PWA;
- icones essenciais.

Se algum recurso essencial nao existir, a instalacao do Service Worker deve falhar em vez de mascarar erro de cache.

## Estrategia de Navegacao

Requests de navegacao usam network-first:

1. tenta a rede;
2. se responder adequadamente e a navegacao for a entrada principal (`./` ou `./index.html`), atualiza o `index.html` cacheado;
3. se a rede falhar, usa `index.html` ou `./` do cache.

Isso permite atualizar a aplicacao quando houver rede e abrir offline depois do primeiro carregamento controlado pelo Service Worker.

A copia cacheada usada como fallback de navegacao nao pode ser substituida por outras respostas locais. Caminhos como `README.md`, `manifest.webmanifest`, CSS, JavaScript, JSON ou imagens nao atualizam `INDEX_URL`, mesmo quando a navegacao retorna `200`.

## Estrategia de Assets

Assets locais conhecidos do app shell usam stale-while-revalidate:

1. entrega o cache quando existe;
2. tenta atualizar o cache em segundo plano;
3. se nao houver cache, tenta rede;
4. se rede e cache falharem, retorna erro controlado.

O Service Worker nao e um proxy universal. Ele nao cacheia requests arbitrarios.

## Regras de Fetch

O Service Worker intercepta apenas:

- metodo `GET`;
- origem igual a `self.location.origin`;
- navegacao;
- assets locais listados no app shell.

Nao intercepta:

- `POST`, `PUT`, `PATCH`, `DELETE`;
- `blob:`;
- `data:`;
- `chrome-extension:`;
- recursos cross-origin.

## Instalacao

O controlador `src/pwa-controller.js` registra `./sw.js` com escopo `./`.

Quando o navegador dispara `beforeinstallprompt`, a aplicacao mostra o botao discreto `Instalar aplicativo`. O prompt so aparece depois do clique do usuario.

Se o navegador nao oferecer `beforeinstallprompt`, o botao nao aparece e a aplicacao continua funcionando normalmente.

Quando a aplicacao ja esta em modo standalone ou quando `appinstalled` dispara, o botao e ocultado.

## Indicador de Conexao

Quando `navigator.onLine === false`, a aplicacao mostra:

```text
Sem conexão — seus dados locais continuam disponíveis.
```

Quando a rede volta, mostra brevemente:

```text
Rede disponível.
```

Esse indicador nao significa sincronizacao, backup ou envio de dados. Ele reflete apenas o estado de rede informado pelo navegador.

## HTTPS e Localhost

Service Workers exigem contexto seguro em producao. Para desenvolvimento, `localhost` e `127.0.0.1` sao aceitos pelos navegadores.

Esta sprint nao configura hospedagem, dominio ou GitHub Pages.

## Atualizacoes Futuras

Em uma nova versao do app, o cache devera ter sua versao atualizada quando necessario. Caches antigos da Plataforma da Pecuaria serao removidos no `activate`.

Dados do IndexedDB nao devem ser removidos por atualizacao de cache.

Nao foi implementado reload automatico de nova versao nesta sprint.

## Riscos e Limitacoes

- O funcionamento offline depende de um primeiro carregamento online bem-sucedido em contexto compativel com Service Worker.
- Dados locais continuam sujeitos a politicas de armazenamento do navegador e do dispositivo.
- IndexedDB nao equivale a backup permanente.
- Instalacao PWA varia por navegador e sistema operacional.
- Impressao offline depende do navegador, sistema operacional e impressora disponivel.
- Nao existe nuvem, login, sincronizacao ou recuperacao remota nesta sprint.

## Impacto no Banco Local

`DB_VERSION` permanece `2`.

Nenhuma migration foi criada.

Nenhuma store foi adicionada, removida ou alterada.
