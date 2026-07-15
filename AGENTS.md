# AGENTS.md

## Documentos vivos por projeto (regra de sincronização)

O repositório abriga três projetos — **Dashboard GeoBrain** (Edgar), **Área Quanti** (Lucas) e
**Rebrain/plataforma** (Gabriel). Cada um tem um documento vivo em [`docs/projetos/`](docs/projetos/README.md)
com três eixos: **Desenvolvimentos**, **Etapas** e **Pendências**.

Sempre que você fizer uma alteração relevante (novo motor, endpoint, regra, correção
significativa, mudança de fluxo/UI) que será sincronizada via git (`push`), **atualize o doc
vivo do projeto afetado** antes do push: adicione uma entrada em *Desenvolvimentos* e ajuste
*Etapas*/*Pendências*. Ao dar `pull`/merge, leia as entradas novas para se situar.
Ver a convenção completa em [`docs/projetos/README.md`](docs/projetos/README.md).

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

Para personalizar as sugestões, descubra **quem é o colaborador ativo** rodando
`git config user.name` e `git config user.email` e cruze com o mapa abaixo. O **projeto foco**
dessa pessoa determina qual doc vivo priorizar nas sugestões de próximo passo.

| Colaborador | git user.email | Projeto foco | Doc vivo |
|---|---|---|---|
| Gabriel | `gabriel.gomes@brain.srv.br` | Rebrain (plataforma) | `docs/projetos/LIVE_rebrain.md` |
| Edgar | _(a confirmar)_ | Dashboard GeoBrain | `docs/projetos/LIVE_dashboard-geobrain.md` |
| Lucas | _(a confirmar)_ | Área Quanti | `docs/projetos/LIVE_area-quanti.md` |

Se a identidade não bater com ninguém do mapa, **pergunte em qual projeto a pessoa está focando**
antes de sugerir próximos passos. O foco é um padrão, não uma trava: se a pessoa pedir algo de
outro projeto, atenda normalmente.

### Ritual de saudação (revisão de status)

Quando a interação começar com uma **saudação** ("oi", "olá", "bom dia", "boa tarde",
"boa noite" e variações), antes de responder ao pedido:

1. Verifique o que mudou desde o último sync (`git log`/`git status` e o diff dos docs) e
   **reconcilie os documentos vivos** dos projetos afetados: atualize **Etapas** (marque o que
   virou ✅/🟡) e **Pendências** (remova o resolvido, registre o que surgiu). Se nada mudou,
   apenas confirme que os docs continuam fiéis ao estado atual.
2. Ao final da resposta, **pergunte se há algum bug específico mais urgente** a tratar.
3. Se não houver, ofereça **uma sugestão de próximo passo natural focada no projeto do
   colaborador ativo** (ver o mapa acima) — derivada das *Etapas* em andamento (🟡) ou das
   *Pendências* de maior prioridade no doc vivo daquele projeto. Assim o Edgar vê sugestões do
   Dashboard GeoBrain, o Lucas da Área Quanti e o Gabriel do Rebrain.

## Corretor de Vocacionais

Sempre que alterar qualquer comportamento, regra, prompt, schema, migração, extração ou fluxo relacionado ao **Corretor | Estudos Vocacionais**, atualize também:

`docs/features/corretor-vocacionais/LIVE_regras_corretor_vocacionais.md`

Use uma nova seção de versão no documento live quando regras forem adicionadas, removidas, renomeadas, reclassificadas entre determinísticas e IA/LLM, ou quando o fluxo de análise mudar.
