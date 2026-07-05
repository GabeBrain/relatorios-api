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

## 3. `.env` (resolvido)

`.env` deixou de ser versionado; `.env.example` documenta as chaves. A anon key é pública por
design, mas o `.env` não deve ir para o git.

## 4. CSP (pendente)

Uma `Content-Security-Policy` em `index.html` foi adiada: o app faz fetch para múltiplos
hosts externos (Supabase, APIs GeoBrain/Sócio) e o Vite injeta estilos inline, então uma CSP
mal calibrada quebraria a aplicação. Definir a política junto com o mapeamento dos hosts
permitidos.

## 5. Token da API Brain em localStorage (aceito)

`src/store/auth-store.ts` guarda o token (TTL 180min) em localStorage — vulnerável a
exfiltração via XSS. Aceitável para ferramenta interna; a CSP (item 4) reduziria o risco.
