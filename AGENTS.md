# AGENTS.md — Plataforma da Pecuária

## Propósito
Instruções permanentes para trabalhar neste repositório. Leia este arquivo antes de implementar qualquer sprint e consulte apenas os documentos relevantes para a tarefa atual.

## Fontes de verdade
Quando necessário, consulte:
- `README.md`
- ADRs em `docs/`
- modelo de dados mais recente em `docs/`
- `docs/BACKLOG_PRODUTO.md`
- testes relacionados ao módulo alterado

Não releia o repositório inteiro sem necessidade.

## Governança
- CEO: visão, decisões finais, `git add`, commit e push.
- CTO: arquitetura, escopo, revisão e aprovação.
- Codex: implementação, testes, QA, documentação e relatório.

### Git — proibido ao Codex sem autorização explícita na tarefa atual
- `git add`
- `git commit`
- `git push`
- `git merge`
- `git rebase`
- `git reset --hard`
- criar/excluir branches
- alterar remotes

Antes de editar, verificar branch atual, `git status` e base da sprint. Nunca iniciar a sprint seguinte sem autorização.

## Arquitetura permanente
A Plataforma da Pecuária é mobile-first, local-first e offline-first.
- PWA instalável.
- IndexedDB para persistência local.
- Service Worker para app shell/offline.
- Sem backend, nuvem, API externa ou dependência relevante sem aprovação.
- Migrations devem preservar dados e compatibilidade legada.

## Modelo conceitual
Entidades principais:
- Account/Operação
- Property/Propriedade
- Paddock/Pasto-Piquete
- Lot/Lote
- Animal
- WeighingSession
- WeighingItem
- AnimalEvent

Relações:
- Lot possui `paddockId` como localização física atual.
- Animal possui `lotId` como agrupamento atual.
- Animal NÃO duplica `paddockId`.
- IDs internos são a autoridade; nomes, tags e textos não substituem IDs.

## Identificação do animal
- `tag`/brinco não é primary key.
- Nunca vincular pesagem a animal automaticamente por igualdade de tag.
- Vínculo formal exige `animalId` explícito.
- Código do brinco não muda quando o animal muda de lote.
- `tagOriginLotId` representa a origem da identificação, não o lote atual.
- Dados legados permanecem válidos e não devem ser convertidos por inferência.

## Histórico e snapshots
- Dados históricos não mudam quando cadastros atuais são renomeados.
- Preservar snapshots existentes de propriedade, lote, pasto e animal.
- Não inventar histórico retroativo em migrations.

## Integridade e transações
- Operações compostas que exigem atomicidade devem usar uma única transação IndexedDB adequada.
- Não permitir gravação parcial.
- Validar no repository/service, não somente na UI: `accountId`, `propertyId`, relacionamentos, unicidade e estados.

## IndexedDB
- Só aumentar `DB_VERSION` por mudança real de schema/store/índice.
- Não recriar store existente por conveniência.
- Migrations devem ser não destrutivas.
- Não migrar registros legados por comparação textual.
- Se houver risco de perda, solicitar PAUSA ARQUITETURAL.

## PWA/offline
Quando o app shell mudar, atualizar cache e assets necessários.
Preservar:
- sem `skipWaiting` automático, salvo decisão explícita;
- limpeza seletiva apenas dos caches do projeto;
- IndexedDB nunca apagado pelo Service Worker;
- assets essenciais sem CDN;
- teste offline após mudanças relevantes.

## Design System e mobile
Reutilizar tokens/componentes existentes. Não criar paleta ou sistema visual paralelo.
Em UI afetada, priorizar mobile-first e evitar overflow horizontal global em 360 px.

## Segurança de DOM
Dados do produtor não devem ser inseridos com:
- `innerHTML`
- `outerHTML`
- `insertAdjacentHTML`

Preferir APIs seguras como `textContent`, `value` e criação explícita de elementos.

## Testes — fluxo econômico
Durante a implementação:
- rodar primeiro testes diretamente relacionados ao código alterado;
- evitar suíte completa após cada pequena edição.

Na entrega final:
- executar toda a suíte existente;
- repetir a suíte somente se correções posteriores puderem afetá-la;
- não remover nem enfraquecer testes para obter verde;
- validar sintaxe quando aplicável.

Todos os testes anteriores devem continuar passando.

## QA — fluxo econômico
Executar apenas QA relevante ao escopo.
Se UI mudar, usar como referência:
- 360x800
- 768x1024 quando útil
- 1280x900

Gerar poucas evidências representativas; não produzir dezenas de screenshots sem necessidade.

## Documentação
Atualizar somente documentos afetados.
Criar/atualizar ADR apenas quando houver decisão arquitetural relevante.
Atualizar modelo de dados quando o modelo realmente mudar.

## Entrega de sprint
Relatório final deve ser conciso e conter:
1. resumo e branch;
2. arquivos criados/modificados/removidos;
3. decisões técnicas relevantes;
4. banco/cache quando alterados;
5. testes e QA executados;
6. limitações/problemas conhecidos;
7. pausas arquiteturais;
8. confirmação de que nenhuma operação Git proibida foi executada.

Gerar ZIP/diff somente quando a ordem da sprint solicitar e apenas na entrega final. Esses artefatos de auditoria não entram no commit salvo instrução contrária.

## Eficiência de contexto
- Não repetir estas regras na resposta final.
- Não resumir arquivos irrelevantes.
- Não escanear documentos sem relação com a tarefa.
- Reutilizar módulos, testes e padrões existentes.
- Preferir mudanças pequenas e focadas.
- Não implementar backlog sem pedido explícito.

## Pausa arquitetural
Parar e pedir decisão do CTO antes de improvisar quando houver:
- mudança estrutural não prevista no modelo;
- risco de perda/regravação de histórico;
- alteração de `propertyId` de entidade existente;
- associação automática por nome/tag;
- duplicação de fonte de verdade;
- backend/nuvem/sincronização;
- dependência externa relevante;
- quebra de compatibilidade legada;
- mudança grande de UX fora do escopo.

## Regra final
Implemente somente o escopo da tarefa atual. Sugestões fora de escopo devem ser registradas, não implementadas sem autorização.
