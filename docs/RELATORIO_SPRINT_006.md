# Relatorio da Sprint 006

## Resumo e Governanca

Estrutura local de rebanho implementada: pastos/piquetes, lotes e animais,
com isolamento por conta/propriedade, arquivamento protegido e pesagem vinculada
opcional. Entrega para auditoria do CTO, nao declaracao de aprovacao.

- Branch: `feature/sprint-006-herd-structure`.
- Base verificada: `05fd9e8`, Sprint 005 aprovada; arvore limpa ao iniciar.
- Nenhum git add, commit, push, merge, rebase, reset --hard, criacao/exclusao
  de branch ou alteracao de remote executado nesta Sprint.
- Nenhuma Sprint 007 iniciada. Nenhuma pausa arquitetural necessaria.
- Nenhuma dependencia adicionada ao aplicativo.

## Arquivos

Inventario completo: `SPRINT_006_ARQUIVOS.txt` (inclui screenshots e logs).

Criados: `src/herd-core.js`, `src/herd-repository.js`, `src/herd-controller.js`,
`src/paddock-core.js`, `src/paddock-repository.js`, `src/lot-core.js`,
`src/lot-repository.js`, `src/animal-core.js`, `src/animal-repository.js`.

Testes criados: cores/repositories de cada entidade, `herd-relations.test.js`,
`herd-weighing.test.js`, `herd-pwa.test.js` e helper `herd-test-helpers.js`.
Scripts: `qa-sprint-006.cjs` e `package-sprint-006.py`.
Documentos: modelo V4, ADR 006, QA 006, este relatorio, inventario e evidencias.

Modificados: `README.md`, `app.js`, `index.html`, `styles/layout.css`, `sw.js`,
`src/local-database.js`, `src/local-data-core.js`, `src/weighing-history-core.js`,
`src/weighing-repository.js`, `scripts/serve.cjs`, `docs/BACKLOG_PRODUTO.md`,
`tests/design-system.test.js`, `tests/pwa-config.test.js`,
`tests/local-database-migration.test.js`.
Arquivos removidos: nenhum.

## Banco e Migration

`DB_VERSION = 4`. Acrescentadas `paddocks`, `lots`, `animals`, chave `id`,
indices nao unicos `accountId`, `propertyId`, `status` em cada uma.
Mantidas as seis stores existentes, incluindo dados e indices.
QA realizou upgrade sobre a Sprint 005 real, comparando profundamente conta,
propriedade, active-account-id, draft, sessoes e itens antes/depois. Passou.
Falhas em callback de writeTransaction abortam a transacao; rollback validado
no IndexedDB real. Sem exclusao, downgrade ou limpeza automatica.

## Entidades e Relacoes

- Paddock: nome obrigatorio, area opcional positiva, observacoes.
- Lot: nome, categoria livre opcional, pasto atual opcional, observacoes.
- Animal: ID estavel, brinco OU nome, sexo opcional, categoria/raca livres,
  nascimento valido opcional, lote opcional e observacoes.
- Animal nao persiste `paddockId`. Local deriva do lote, que aponta para pasto.
- Renomear/mover nao troca IDs. `propertyId` nao pode ser editado.
- Nomes e brincos iguais em propriedades diferentes nao misturam cadastros.
- Nenhum `animalCount` persistido; contadores de ativos sao derivados.

Repositories verificam conta/propriedade e referencias dentro da mesma
transacao da gravacao. Duas contas artificiais e chamadas com referencias
forjadas foram testadas. Arquivamento de pasto com lote ativo e lote com animal
ativo e recusado. Desvincular/mover permite arquivar. Reativar filho exige pai
ativo ou desvinculacao previa. Arquivado nao e vendido/morto/abatido.

## Interface e Pesagem

Nova tab Rebanho: propriedade, contadores, busca tag/nome e secoes de cards
para pastos, lotes e animais. Formularios com erro proximo do campo, edicao,
mudanca de vinculo e arquivamento/reativacao. Propriedade trocada limpa contexto
e impede exibir dados de outra. Dados inseridos via createElement/textContent.
Design System V1, tokens, foco, componentes e marca preservados. Navegacao
mobile acomoda a nova tab em duas linhas, sem largura global excedente.

Calculadora continua funcionando livremente. Selecao opcional mostra lotes
ativos da propriedade. Trocar propriedade limpa vinculo incompativel sem apagar
as linhas de pesagem. Draft schema 2 aditivo guarda lotId/lotName, preserva
schemas legados, IDs e pastos temporarios. Nao cria vinculo por nome.

Historico salva lotId/lotNameSnapshot e paddockId/paddockNameSnapshot no momento
da gravacao; consultas posteriores nao renomeiam registros antigos. Precos,
rendimento, totais e animalId null permanecem. Filtro por ID do lote, combinavel
com propriedade, inclui sem vinculo. Romaneios mostram snapshots.

## Offline e PWA

`plataforma-pecuaria-shell-v4`, com todos os nove modulos novos. Mantidas
network-first para navegacao com protecao do index e stale-while-revalidate
para assets conhecidos, same-origin, GET. Sem skipWaiting.

Passou: app carregado online -> rede desativada e servidor encerrado -> CRUD
de rebanho -> fechar pagina -> reabrir -> persistencia -> pesar e finalizar ->
fechar/reabrir -> consultar historico. Sem API externa. Evidencia detalhada
em `qa-sprint-006/evidence.json` e screenshot `offline-historico.png`.

## Testes e QA

```text
tests 138
pass 138
fail 0
cancelled 0
skipped 0
```

97 anteriores preservados; 41 novos. Resultado TAP integral em
`qa-sprint-006/tests.txt`; sintaxe em `qa-sprint-006/syntax.txt`.
Navegador: migration, cache update, QA A-J, filtros, DOM seguro, validacao,
busca, duas contas, concorrencia, rollback e impressao passaram.
Referencia: 2 animais, 960 kg total, 480 kg medio, 32 @, R$ 9.600,00.
360x800, 768x1024, 1280x900 sem overflow global; capturas de telas/formularios
e rodape do formulario animal. Detalhamento em `QA_SPRINT_006.md`.

## Execucao

```powershell
node scripts/serve.cjs
# http://127.0.0.1:8026/index.html
node --test tests/*.test.js
```

QA: Playwright disponivel no ambiente de desenvolvimento, nao no aplicativo;
`node scripts/qa-sprint-006.cjs`. `QA_BROWSER_PATH` opcional permite escolher
um navegador Chromium/Edge local. O servidor de QA usa porta temporaria.
Publicacao deve usar HTTPS. Atualizacao do PWA exige fechar clientes antigos
para o worker novo assumir naturalmente.

## Limitacoes e Itens Pendentes

- Homologacao fisica Android nao executada; necessaria apos publicacao.
- Sem testes de carga com grandes rebanhos nesta entrega.
- Dados continuam locais, sem backup/recuperacao remota.
- Nao ha autenticacao: isolamento e logico, nao uma barreira contra acesso
  fisico ao perfil do navegador.
- Sem historico individual/movimentacoes, transferencia entre propriedades,
  capacidade de pasto, sanidade/reproducao, financeiro, nuvem ou sincronizacao.
- Brinco nao e chave unica; identidade exige ID, sem deduplicacao automatica.
- Nenhum criterio de implementacao da ordem ficou intencionalmente pendente;
  aprovacao final permanece com o CTO.

## Sugestoes Separadas (Nao Implementadas)

| Problema | Proposta | Beneficio | Riscos | Prazo | Arquitetura/modulos |
| --- | --- | --- | --- | --- | --- |
| Perda do armazenamento do dispositivo | Sprint de backup/restauracao versionada | Recuperacao verificavel | Dados inconsistentes se importacao incompleta | Estimativa depende do escopo aprovado | Migra/repositories e futura UI de backup; exige ADR proprio |
| Listas grandes carregadas em memoria | Medir escala real e avaliar paginacao/indices compostos | Resposta previsivel | Complexidade prematura | Medicao curta; implementacao a estimar | herd-controller e repositories, eventual migration somente autorizada |

Nenhuma sugestao foi implementada automaticamente. O backlog mantem eventos
pecuarios, arrendamento/parcerias e sincronizacao para decisao posterior.

## Auditoria

- Codigo/diff completo, incluindo arquivos novos e binarios: `SPRINT_006_ENTREGA.diff`.
- Projeto completo: `../sprint_006_entrega.zip`, caminhos internos `/`, CRC validado.
- Screenshots/logs/JSON/PDF incluidos no ZIP.
- Os dois artefatos diff/ZIP NAO devem entrar no futuro commit.
- Nenhum git add/commit/push/merge/rebase nesta entrega. Aguardar avaliacao do CTO.
