# Instruções de Execução — Reorganização, Legado e Segurança (relatorios-api)

> **Doc de instrução para execução pelo Opus (Claude Code).**
> Contexto aprovado pelo Gabriel em 05/07/2026. Executar as fases **na ordem**, commitando ao final de cada fase com mensagem descritiva.
> Regra geral: nada de perda real de conteúdo — arquivos pesados removidos ficam recuperáveis via histórico git.

---

## Contexto do projeto

- SPA React + Vite + TypeScript (origem Lovable), Supabase como backend (projeto `mxinpvcqzbfbzjodhgtz`).
- Rotas ativas em `src/App.tsx`; menu lateral em `src/components/layout/AppLayout.tsx`.
- As páginas **Mapa** (`/mapa` → `src/pages/Index.tsx`) e **Assistente** (`/assistente`) estão sendo desenvolvidas em paralelo por **outro time**. Decisão: aposentá-las funcionalmente aqui — manter só "cascas" navegáveis e arquivar o código-motor.
- A feature **Corretor | Estudos Vocacionais** (`src/features/corretor/`, edge function `supabase/functions/analyze-slide`) é o próximo foco de desenvolvimento — **não alterar seu comportamento** nestas fases (exceto itens de segurança da Fase 3).

---

## FASE 1 — Legado: Mapa e Assistente

### 1.1 Renomear seção do menu
Em `src/components/layout/AppLayout.tsx` (~linha 99): seção `id: 'em-implementacao'`, `label: 'Em implementação'` → `id: 'legado'`, `label: 'Legado'`. Ajustar o ícone se fizer sentido (ex.: `Archive` do lucide).

### 1.2 Criar `src/legacy/mapa/` e mover o ecossistema do Mapa
Mover (com `git mv`, preservando histórico) todos os arquivos **exclusivos do Mapa** — verificado que nada mais os importa:

| Origem | Destino |
|---|---|
| `src/pages/Index.tsx` | `src/legacy/mapa/pages/Index.tsx` |
| `src/components/map/` | `src/legacy/mapa/components/map/` |
| `src/components/study/` | `src/legacy/mapa/components/study/` |
| `src/components/sidebar/` | `src/legacy/mapa/components/sidebar/` |
| `src/components/upload/` | `src/legacy/mapa/components/upload/` |
| `src/hooks/use-geo-worker.ts`, `use-municipal-layer.ts`, `use-sector-layer.ts` | `src/legacy/mapa/hooks/` |
| `src/lib/geo-utils.ts`, `spatial.ts`, `kml-loader.ts`, `ibge-selection.ts`, `municipal-metrics.ts`, `sector-metrics.ts` | `src/legacy/mapa/lib/` |
| `src/store/map-store.ts` | `src/legacy/mapa/store/` |
| `src/workers/geo-parser.worker.ts` | `src/legacy/mapa/workers/` |
| `scripts/*.py` | `src/legacy/mapa/scripts/` (deletar `scripts/__pycache__/`) |

Regras:
- Corrigir os imports **internos** entre os arquivos movidos (paths relativos ou `@/legacy/mapa/...`) apenas o suficiente para o TypeScript não quebrar o build. Se algum arquivo legado referenciar algo removido, é aceitável adicionar `// @ts-nocheck` no topo do arquivo legado — a prioridade é o app ativo compilar limpo, não o legado.
- **Nenhum arquivo fora de `src/legacy/` pode importar de `src/legacy/`** (garante tree-shaking total). Verificar com grep ao final.
- ⚠️ Antes de mover cada lib de `src/lib/`, rodar grep confirmando que só o ecossistema do Mapa a importa. Em caso de uso compartilhado (ex.: se alguma página ativa usar `spatial.ts`), a lib **fica** em `src/lib/` e o legado importa dela — não duplicar.

### 1.3 Casca do Mapa
Criar `src/pages/MapaLegado.tsx` no mesmo estilo visual de `src/pages/Assistente.tsx` (ícone central, título, card informativo), dizendo:
- A funcionalidade de Mapa Geoespacial está sendo desenvolvida em paralelo por outro time, fora deste repositório.
- O código desta versão está preservado em `src/legacy/mapa/` e os dados no histórico git.
- Resumo do que a feature fazia: camadas socioeconômicas municipais (IBGE 2024), setores POF 2022 (Curitiba/Goiânia/Maceió), estudo de caso Av. Kennedy (Curitiba), upload de KML/KMZ/GeoJSON com análise espacial.

Em `src/App.tsx`: trocar o import de `./pages/Index.tsx` por `./pages/MapaLegado.tsx` na rota `/mapa`. Remover o import antigo.

### 1.4 Ajustar texto do Assistente
Em `src/pages/Assistente.tsx`: atualizar o texto para refletir o novo status — em desenvolvimento por outro time / fora do escopo deste repositório (substituir a narrativa de "stand-by V1 / será ativada em V2"). Manter o estilo visual.

### 1.5 Remover dados pesados do working tree (recuperáveis via git)
`git rm` (remoção total, SEM cópia local — decisão explícita do Gabriel):
- `public/data/` **inteiro** (~37MB: `ibge_municipios_2024_socio.geojson` 30MB, `study/current/`, `study/kennedy/`, `pof_setores_2026/`)
- Fontes geo brutas de `assets/`: `POF_Curitiba_Domicilios2022.geojson`, `POF_Curitiba_Goiania_Maceio_Domicilios2022.geojson`, `relatorio_areas_selecionadas_.xlsx`, `*.kml`, `*.kmz`
- `assets/desktop.ini`
- Deletar a pasta local `dist/` (build antigo, não versionado, contém cópia dos dados)

Adicionar ao `.gitignore`:
```
public/data/
*.geojson
*.kml
*.kmz
dist/
__pycache__/
```
(⚠️ conferir antes se algum geojson pequeno é necessário ao app ativo — pela análise, nenhum é.)

### 1.6 Documentar os dados removidos
Criar `src/legacy/mapa/DATA_SOURCES.md` listando cada dataset removido: nome do arquivo, tamanho, fonte (IBGE 2024, POF 2022, estudos Kennedy/Curitiba), script python que o gerava, e a instrução de recuperação: `git log --diff-filter=D -- public/data/` + `git checkout <commit>^ -- <path>`.

### 1.7 Limpar dependências npm órfãs
Após o desacoplamento, verificar com grep no `src/` ativo (excluindo `src/legacy/`) e remover do `package.json` as que só o Mapa usava — candidatas confirmadas: `maplibre-gl`, `@tmcw/togeojson`. Verificar também `jszip` ou similares se existirem. **Manter `xlsx`** (usado pelo export do SECOVI em `TestesArquitetura.tsx`).
Consolidar lockfiles: o projeto usa npm (`package-lock.json` mais recente) → deletar `bun.lock` e `bun.lockb`. Rodar `npm install` para regenerar o lock após remover dependências.

### 1.8 Verificação da Fase 1
- `npx tsc --noEmit` limpo (ou erros restritos a `src/legacy/` com `@ts-nocheck` aplicado).
- `npm run build` com sucesso; conferir que o bundle não contém maplibre.
- `grep -r "legacy" src/ --include="*.tsx" --include="*.ts" -l` → só arquivos dentro de `src/legacy/` e o `App.tsx`/casca NÃO devem importar de legacy.
- Rodar o app: `/mapa` e `/assistente` mostram cascas; demais páginas intactas (documentação, corretor, SECOVI, TQs).
- **Commit**: `Aposenta Mapa e Assistente como legado; remove 70MB de dados geo do working tree`

---

## FASE 2 — Reorganização da documentação

Criar a estrutura e mover com `git mv`:

```
docs/
├── architecture/
│   ├── DESIGN_SYSTEM.md              ← de assets/DESIGN_SYSTEM.md
│   └── migration-paridade-v1.md      ← de docs/migration/paridade-v1.md
├── features/
│   ├── corretor-vocacionais/
│   │   ├── Ata_Reuniao_Briefing_Grupo_Impper_Sao_Jose_do_Rio_Preto.docx   ← de "assets/ref corretor/" (renomear sem acentos/parênteses)
│   │   └── Vocacionais_parametros_de_correcao.pptx                        ← idem
│   ├── relatorios-secovi/
│   │   ├── Analise Temporal Excel - Barretos.xlsx        ← de docs/ref/
│   │   ├── Relatorio Barretos_1T_2026_real.xlsx          ← de docs/ref/
│   │   ├── Relatorio_Barretos_1T2026_versaoPOC_revisado_Juliana.xlsx
│   │   └── Relatorio_Barretos_1T26_v4.xlsx
│   └── cid-validacao/
│       └── Validacao_Dados_CID.ipynb                     ← de docs/ (renomear sem acentos)
```

- Apagar as pastas vazias resultantes (`docs/ref/`, `docs/migration/`, `assets/ref corretor/`).
- `assets/` fica só com: `logoBrain.png`, `braininteligenciaestrategica_logo.jpg` (avaliar mover para `src/assets/` ou `public/` se forem usados pelo app — verificar imports antes; se não usados, deixar em `assets/`).
- Criar `docs/README.md` curto: índice da estrutura de docs, uma linha por pasta explicando o que contém.
- Reescrever o `README.md` raiz (substituir o placeholder Lovable): o que é a plataforma (hub interno Brain de relatórios e QA de dados imobiliários), stack, funcionalidades ativas (Documentação API, Playground de requisições, Relatórios SECOVI, TQ Piemonte VGV / Release Price / CID, Corretor Vocacionais), seção Legado (Mapa/Assistente), como rodar (`npm install`, `npm run dev`, `.env` a partir do `.env.example`), estrutura de pastas.
- **Commit**: `Reorganiza documentação em docs/architecture e docs/features; novo README`

---

## FASE 3 — Segurança

### 3.1 `.env` fora do git
- `git rm --cached .env` (mantém local) e adicionar `.env` ao `.gitignore`.
- Criar `.env.example` com as três chaves `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_URL` com valores placeholder (`your-project-id`, etc.).
- Nota no README: a anon key é pública por design, mas o `.env` não deve ser versionado.

### 3.2 Restringir RLS do Corretor (migration nova)
Criar `supabase/migrations/<timestamp>_tighten_corretor_rls.sql`. Problema atual: policies `using (true)` para anon em `projects`/`slides`/`slide_errors`, incluindo **DELETE em projects**, e bucket `slide-thumbnails` com insert/select/delete anônimos.

Abordagem (mínimo viável sem quebrar a feature, que hoje roda sem login):
- **Remover a policy `anon_delete_projects`** e a `anon_delete_thumbnails` — elimina o vetor de destruição de dados por terceiros. A UI de exclusão de projetos (se existir em `CorretorPage.tsx`/`archive-db.ts`) deve ser verificada: se houver botão de deletar, documentar no doc da fase que a exclusão passará a exigir service role / painel Supabase até a adoção de auth, OU manter delete mas condicionado a um header custom não é possível via RLS — nesse caso registrar a limitação e discutir com o Gabriel antes de aplicar.
- Deixar comentário na migration recomendando a médio prazo: Supabase Auth + policies `authenticated`.
- **NÃO aplicar a migration no projeto remoto sem confirmação do Gabriel** — apenas deixá-la pronta no repo e listar o comando (`npx supabase db push` ou aplicar via dashboard).

### 3.3 Endurecer a edge function `analyze-slide`
Em `supabase/functions/analyze-slide/index.ts`:
- **Limite de payload**: rejeitar `base64` acima de ~4MB (413) e validar campos (`slideNumber`/`total` numéricos, `model` ∈ {gpt-4o, gpt-4o-mini} — hoje o `model` vem do cliente sem validação e vai direto para a OpenAI).
- **CORS**: trocar `Access-Control-Allow-Origin: '*'` por origem(ns) permitidas — usar env `ALLOWED_ORIGIN` com fallback para o domínio de produção; incluir `http://localhost:5173` para dev. (Descobrir o domínio de produção perguntando ao Gabriel ou procurando config de deploy; se não houver, deixar env documentada.)
- **Rate limiting básico**: melhor-esforço em memória por IP (`req.headers.get('x-forwarded-for')`), ex. máx 30 req/min — documentar que é mitigação parcial (instâncias efêmeras).
- Manter contrato de resposta idêntico (o frontend `openai-analyzer.ts` não deve precisar de mudanças).
- **Não fazer redeploy da função sem confirmação do Gabriel** — deixar o código pronto e o comando documentado (`npx supabase functions deploy analyze-slide`).

### 3.4 Higienes menores
- `src/components/layout/AuthBlock.tsx`: se a URL de login for editável livremente pelo usuário, restringir a uma allowlist de hosts da Brain (constante no código) — evita envio de credenciais a servidor arbitrário. Se for um campo fixo/pré-preenchido, apenas confirmar e seguir.
- Adicionar meta CSP básica em `index.html` se não conflitar com o dev do Vite (se conflitar, registrar como pendência no README em vez de aplicar).
- **Commit**: `Segurança: .env fora do git, RLS restrita, hardening da edge function analyze-slide`

### 3.5 Verificação da Fase 3
- Build + app funcionando; fluxo do Corretor testável localmente (upload → análise) continua íntegro com a função ainda não redeployada.
- `git ls-files | grep .env` → vazio.

---

## FASE 4 — NÃO EXECUTAR (registro apenas)

A próxima etapa após estas fases é a evolução do **Corretor | Estudos Vocacionais** usando como contexto:
- `docs/features/corretor-vocacionais/Vocacionais_parametros_de_correcao.pptx` (parâmetros de correção → evoluir o prompt hardcoded em `supabase/functions/analyze-slide/index.ts`)
- `docs/features/corretor-vocacionais/Ata_Reuniao_Briefing...docx`

Essa fase será conduzida em sessão própria com o Gabriel. **Parar ao final da Fase 3.**

---

## Regras gerais de execução

1. Uma fase por vez, commit ao final de cada uma (não fazer push sem o Gabriel pedir).
2. Antes de mover/deletar qualquer arquivo, grep para confirmar que nada ativo o referencia.
3. Qualquer ambiguidade que mude comportamento do app → perguntar ao Gabriel, não decidir sozinho.
4. Ao final, apresentar resumo por fase: arquivos movidos/removidos, tamanho economizado, resultado do build e pendências que exigem ação manual (db push, deploy da função, domínio de produção).
