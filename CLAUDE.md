# CLAUDE.md

## Documentos vivos por projeto (regra de sincronização)

Três projetos convivem neste repo — **Dashboard GeoBrain** (Edgar), **Área Quanti** (Lucas) e
**Rebrain/plataforma** (Gabriel) — cada um com um documento vivo em `docs/projetos/`
(eixos: **Desenvolvimentos**, **Etapas**, **Pendências**).

Ao concluir uma alteração relevante que será enviada via `git push`, atualize o doc vivo do
projeto afetado (entrada nova em *Desenvolvimentos* + ajuste de *Etapas*/*Pendências*) **antes
do push**. Após `pull`/merge, leia as entradas novas para se situar. Convenção completa em
`docs/projetos/README.md`.

- Dashboard GeoBrain → `docs/projetos/LIVE_dashboard-geobrain.md`
- Área Quanti → `docs/projetos/LIVE_area-quanti.md`
- Rebrain → `docs/projetos/LIVE_rebrain.md`

As alterações podem vir do **Lovable**, do **Codex do Lucas** (sobretudo Área Quanti) ou da equipe.
Registre no doc o autor/origem real, mas determine o ambiente pela funcionalidade alterada — nunca
pela ferramenta que gerou o commit. Antes de push/merge, execute
`npm run check:live-docs -- <base> <head>`.

## Fluxo de entrega: `main` direta

Os testes e a publicação acontecem pela **`main`**. Desenvolva, teste, documente e committe
diretamente nela: não abra branches para features, correções ou experiências. Isole o código no
módulo/feature apropriado, não em uma branch.

Antes de começar, confirme `git branch --show-current` = `main` e uma árvore limpa. Antes do push,
rode as validações aplicáveis e `npm run check:live-docs -- <base> <head>`. Se uma branch local
tiver sido criada por engano, aplique os commits necessários na `main` e apague-a depois de
verificar que não restou trabalho exclusivo.

## Padrão obrigatório: GeoApiScopeEngine

Para qualquer tela que use filtros geográficos e chamadas à API GeoBrain, usar o padrão
`GeoApiScopeEngine` (`src/features/shared/geo-api-scope-engine/`). Fluxo obrigatório:

1. Carregar `/public-api/monitored-cities` (paginando `links.next`).
2. Limitar UF/município às cidades disponíveis para o token.
3. Exigir UF antes de município; ao trocar UF, limpar município.
4. Bloquear chamadas pesadas de histórico até escopo válido.
5. Sem fallback silencioso para `municipios-br.json` (IBGE) — em erro, exibir a falha
   ao usuário e não carregar dashboard/relatório.

Referência funcional original: Relatórios Secovi (`src/pages/TestesArquitetura.tsx`).
Dashboard GeoBrain e CID legado usam o mesmo padrão. Consuma via
`GeoApiScopeSelector` + `useGeoApiScope` do módulo compartilhado.

### Identificação do colaborador (foco por projeto)

Descubra **quem é o colaborador ativo** rodando `git config user.name` e `git config user.email`
e cruze com o mapa abaixo. O **projeto foco** dessa pessoa determina qual doc vivo priorizar nas
sugestões de próximo passo.

| Colaborador | git user.email | Projeto foco | Doc vivo |
|---|---|---|---|
| Gabriel | `gabriel.gomes@brain.srv.br` | Rebrain (plataforma) | `docs/projetos/LIVE_rebrain.md` |
| Edgar | _(a confirmar)_ | Dashboard GeoBrain | `docs/projetos/LIVE_dashboard-geobrain.md` |
| Lucas | _(a confirmar)_ | Área Quanti | `docs/projetos/LIVE_area-quanti.md` |

Se a identidade não bater com ninguém, **pergunte em qual projeto a pessoa está focando**. O foco
é um padrão, não uma trava: se pedirem algo de outro projeto, atenda normalmente.

### Ritual de saudação (resumo de status por ambiente)

Quando a interação começar com uma **saudação** ("oi", "olá", "bom dia", "boa tarde",
"boa noite" e variações), antes de responder ao pedido:

1. Consulte `git status`, `git log` desde as entradas mais recentes e os três docs vivos. Não
   altere docs apenas por cumprimentar: reconcilie-os somente quando um commit/merge relevante
   estiver sem registro ou quando Etapas/Pendências estiverem comprovadamente desatualizadas.
2. Responda com um **resumo por ambiente/funcionalidade** (Dashboard GeoBrain, Área Quanti e
   Rebrain, incluindo suas features): última alteração relevante com **data, autor e nome da
   funcionalidade**, estado da etapa e até duas pendências prioritárias. Diga claramente se
   houver árvore de trabalho suja ou `documentação pendente`.
3. Para cada commit relevante sem doc vivo, registre (ou proponha registrar, se faltar contexto)
   uma entrada com ambiente, autor, hashes e impacto em Etapas/Pendências, conforme
   `docs/projetos/README.md`. Commits pequenos de uma só entrega podem ser agrupados.
4. **Depois de apresentar as pendências mais latentes**, pergunte se há algum bug específico que o
   autor queira endereçar. Se não houver, sugira um próximo passo natural focado no projeto do
   colaborador ativo, derivado das Etapas/Pendências.

## Guidelines de frontend — Rebrain

Antes de desenvolver ou alterar interface React, leia
`docs/architecture/FRONTEND_GUIDELINES.md` e o `DESIGN_SYSTEM.md`. Classifique o pedido, reutilize
o padrão/componente existente e cubra os estados de página aplicáveis. Páginas de feature são lazy
por padrão; exceções duradouras (novo primitive, token, fluxo ou desvio de lazy-loading) devem ser
registradas em `docs/architecture/FRONTEND_DECISIONS.md`. No handoff, informe o padrão reutilizado e
os estados verificados. Essas regras se aplicam a Lovable, Codex do Lucas e qualquer outro autor.

## Corretor de Vocacionais

Ao modificar qualquer parte do **Corretor | Estudos Vocacionais** (`src/features/corretor/`, `supabase/functions/analyze-slide/`, migrations relacionadas ou documentação da feature), atualize o documento vivo:

`docs/features/corretor-vocacionais/LIVE_regras_corretor_vocacionais.md`

Registre mudanças por versão, separando regras determinísticas, regras IA/LLM, POCs e regras removidas.
