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

### Ritual de saudação (revisão de status)

Quando a interação começar com uma **saudação** ("oi", "olá", "bom dia", "boa tarde",
"boa noite" e variações), antes de responder ao pedido:

1. Verifique o que mudou desde o último sync (`git log`/`git status` + diff dos docs) e
   **reconcilie os documentos vivos** dos projetos afetados: atualize **Etapas** (✅/🟡) e
   **Pendências** (remova o resolvido, registre o que surgiu). Se nada mudou, confirme que os
   docs seguem fiéis ao estado atual.
2. Ao final da resposta, **pergunte se há algum bug específico mais urgente** a tratar.
3. Se não houver, sugira **um próximo passo natural focado no projeto do colaborador ativo**
   (ver mapa acima) — derivado das *Etapas* em andamento (🟡) ou das *Pendências* prioritárias
   do doc vivo daquele projeto. Assim Edgar vê sugestões do GeoBrain, Lucas da Quanti e Gabriel
   do Rebrain.

## Corretor de Vocacionais

Ao modificar qualquer parte do **Corretor | Estudos Vocacionais** (`src/features/corretor/`, `supabase/functions/analyze-slide/`, migrations relacionadas ou documentação da feature), atualize o documento vivo:

`docs/features/corretor-vocacionais/LIVE_regras_corretor_vocacionais.md`

Registre mudanças por versão, separando regras determinísticas, regras IA/LLM, POCs e regras removidas.
