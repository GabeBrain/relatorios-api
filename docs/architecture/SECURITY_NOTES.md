# Notas de Segurança — dívidas conhecidas

Registro das decisões de segurança e pendências, para não se perderem.

## 1. RLS do Corretor aberta a anon (DÍVIDA TÉCNICA — aceita por ora)

**Estado atual:** as tabelas `projects`, `slides`, `slide_errors` e o bucket
`slide-thumbnails` têm policies `using (true)` para a chave **anon**, incluindo
`SELECT`, `INSERT` e `DELETE`. Como a anon key é pública (vai no bundle do frontend),
qualquer pessoa que descubra a URL do projeto Supabase pode **ler** e **apagar** os dados
do Corretor.

**Por que não foi fechado agora:** a feature roda sem login e usa DELETE anônimo de forma
legítima — os botões *"excluir projeto"* e *"limpar tudo"*
(`src/features/corretor/lib/archive-db.ts`) dependem disso. Remover só o DELETE quebraria a
funcionalidade sem resolver o vazamento de leitura. RLS sozinha não distingue uso legítimo
de abuso porque a chave é a mesma.

**Fix correto (planejado):** colocar a plataforma atrás de **Supabase Auth** e trocar as
policies para `authenticated` (ou por `owner`/organização). Isso resolve leitura E escrita
indevidas e habilita auditoria. Decisão de escopo próprio — ver também a recomendação de
autenticação unificada da plataforma.

**Risco aceito enquanto isso:** exposição caso a URL do projeto Supabase vaze.

## 2. Edge function `analyze-slide` (endurecida)

Aplicado: validação de payload (base64 ≤ ~5MB → 413), whitelist de `model`, validação de
campos, CORS por allowlist (secret `ALLOWED_ORIGINS` + localhost de dev) e rate limit
best-effort (30 req/min por IP). O rate limit é mitigação parcial (instâncias efêmeras).

**Pendências:** definir o(s) domínio(s) de produção no secret `ALLOWED_ORIGINS` do Supabase
antes de confiar no CORS em produção. Considerar exigir o token de auth (item 1) na função.

## 3. `.env` — VERSIONADO de propósito (não mexer)

O `.env` **é versionado neste projeto** porque o **Lovable builda a partir do repositório** e
lê as `VITE_SUPABASE_*` diretamente do `.env` commitado. Removê-lo do git quebra o build de
produção com `supabaseUrl is required` (só a Dashboard Geobrain, que usa API HTTP, sobrevive).

A anon key é pública por design, então versioná-la não expõe segredo real. Segredos de
backend (ex.: `OPENAI_API_KEY`, `ALLOWED_ORIGINS`) NUNCA ficam no `.env` — vão nos **Secrets do
Supabase**. O `.env.example` permanece como documentação das chaves.

> Melhoria futura (opcional): mover as `VITE_SUPABASE_*` para as variáveis de ambiente do
> Lovable (painel do projeto) e então voltar a remover o `.env` do git. Só fazer isso depois de
> confirmar que o build do Lovable enxerga as variáveis pelo painel.

## 3b. CORS da edge function — produção configurada

`ALLOWED_ORIGINS` (Secret do Supabase) = `https://geobrain-relatorios.lovable.app` (domínio
publicado). Localhost de dev já é liberado pela própria função. O preview interno do Lovable
usa subdomínios dinâmicos `id-preview-*.lovable.app` — se for testar de lá, ou usa a URL
publicada, ou relaxa o CORS para `*.lovable.app`.

## 4. CSP (pendente)

Uma `Content-Security-Policy` em `index.html` foi adiada: o app faz fetch para múltiplos
hosts externos (Supabase, APIs GeoBrain/Sócio) e o Vite injeta estilos inline, então uma CSP
mal calibrada quebraria a aplicação. Definir a política junto com o mapeamento dos hosts
permitidos.

## 5. Token da API Brain em localStorage (aceito)

`src/store/auth-store.ts` guarda o token (TTL 180min) em localStorage — vulnerável a
exfiltração via XSS. Aceitável para ferramenta interna; a CSP (item 4) reduziria o risco.

## 6. Vulnerabilidades npm (parcialmente corrigidas — 05/jul/2026)

`npm audit fix` aplicado: corrigiu 9 de 12 (incluindo o XSS via open redirect do
react-router-dom ≤6.30.2, lodash, ws, glob, minimatch, picomatch, postcss, yaml). Restam:

- **esbuild/vite** (moderate): afeta só o dev server; fix exige upgrade breaking do Vite
  (5 → 8). Fazer numa janela própria, com testes.
- **xlsx (SheetJS)** (high, sem fix no npm): prototype pollution + ReDoS. Caminhos:
  migrar para `exceljs` ou usar o build do fork oficial (cdn.sheetjs.com). Risco real
  moderado — o app usa a lib majoritariamente para *gerar* planilhas, não parsear
  arquivos não confiáveis.

## 7. Log de atividade por IP + veredito de revisão (05/jul/2026)

Sem login por decisão de fase de testes (analistas perdem senha; auth vira atrito).
Rastreabilidade mínima via `activity_log`:

- Tabela `activity_log` (migration `20260705000000`): anon **só lê**; INSERT apenas via
  service role na edge function **`log-activity`**, que captura o IP (`x-forwarded-for`)
  no servidor. Não confiar no log como controle de segurança — é trilha de auditoria leve.
- A mesma migration adiciona `slide_errors.verdict` + policy `anon_update_errors`
  (UPDATE aberto a anon, coerente com o modelo do item 1 e coberto pelo mesmo fix futuro
  via Supabase Auth).

**Pendências de deploy:** aplicar a migration (`supabase db push` ou SQL editor) e
`supabase functions deploy log-activity`.
