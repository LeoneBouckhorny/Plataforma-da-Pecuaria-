# ADR 005 - Identidade visual e Design System

Status: implementado para auditoria tecnica; direcao visual previamente
aprovada pelo CTO. Nao equivale ao aceite final da Sprint 005.

## Contexto

O app possui calculadora, historico, propriedades e PWA local-first ja
aprovados. A Sprint 005 unifica a identidade preservando esses contratos.

## Decisoes

1. Preservar os assets do checkpoint aprovado em `assets/branding/` e
   promover seus PNGs para os caminhos PWA existentes.
2. Usar simbolo e nome no header, sem a assinatura institucional reduzida.
3. Centralizar estilos em tokens/base/components/layout/print. Manter
   `styles.css` como ponto de entrada, sem bundler ou framework.
4. Manter Montserrat como referencia e fallback local autorizado. Nenhum
   download de fonte, @font-face remoto ou CDN foi introduzido.
5. Usar somente seis arquivos de icones Lucide, com avisos de licenca
   preservados, sem biblioteca JavaScript de icones em runtime.
6. Manter a logica de disponibilidade do botao de instalacao. O CSS oculta
   o container quando todos os seus controles estao hidden.
7. Incrementar somente o cache de app shell de v2 para v3 e incluir todos
   os CSS/SVG/PNG essenciais. Manter instalacao/ativacao/fetch/fallback do
   Service Worker sem alteracao de logica e sem skipWaiting.
8. Manter DB_VERSION = 3. Nenhuma store, indice, migracao, repository,
   calculo, autosave, finalizacao, CSV ou filtro foi alterado.

## Consequencias

O navegador precisa ter carregado o app shell para uso offline, como antes.
O novo Service Worker aguarda o encerramento dos clientes antigos para
ativar naturalmente. Nao existe reload forcado. O teste de atualizacao
fecha o cliente v2, observa a ativacao fora do escopo e reabre o aplicativo.
O estado final e cache v3 apenas, com as seis stores preservadas.

CSS :has e CSS mask sao usados em navegadores modernos. Instalacao e
atualizacao do icone pelo launcher podem variar entre navegadores Android;
e necessaria homologacao fisica apos publicacao.

Os wordmarks SVG mantem texto editavel e dependem da fonte local. Nao foram
convertidos em curvas com uma fonte Montserrat nao fornecida/licenciada.

## Fora do escopo

Nenhum dashboard novo, funcionalidade de gestao, backend, login, nuvem ou
sincronizacao. Nenhuma Sprint 006 iniciada. Nenhuma pausa arquitetural foi
necessaria. Sugestoes para fonte/licenciamento ou homologacao futura nao
foram implementadas como expansao do escopo.
