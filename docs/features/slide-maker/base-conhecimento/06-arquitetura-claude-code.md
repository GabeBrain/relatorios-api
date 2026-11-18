> ⚠️ **SUBSTITUÍDO em 12/11/2026.** Este documento descreve o desenho antigo (projeto Claude Code com pastas `jobs/` e comando `/qualificar`). O sistema em desenvolvimento segue `docs/features/slide-maker/INSTRUCOES_DESENVOLVIMENTO.md` no repositório `relatorios-api`. Mantido só como histórico; não usar como instrução.

# 06 — Arquitetura no Claude Code

Proposta de implementação. Prioridade: **funcionar com o mínimo de código**, deixando o raciocínio para o Claude e o determinístico para scripts.

---

## 1. Estrutura do repositório

```
brain-qualificador/
├── CLAUDE.md                         # regras sempre carregadas (arquivo pronto nesta base)
├── docs/
│   ├── 01-historico-e-padroes.md
│   ├── 02-identidade-e-voz-brain.md
│   ├── 03-processo-de-qualificacao.md
│   ├── 04-briefing-template.md
│   └── 05-checklist-qa.md
├── marca/
│   ├── manual-de-marca.pdf
│   ├── template-brain.pptx           # masters/layouts oficiais
│   ├── logos/                        # Logo-Brain(.png | -Sem tagline | -Branco | -Branco-Sem tagline) + parceiros/
│   ├── slides-finais/                # slide final por consultor (fabio, guilherme, finoti) — 1920×1080
│   ├── publicacoes/                  # ilustrações e linguagem visual de e-books Brain (para material-fonte)
│   └── fontes/                       # Neo Sans Pro, Montserrat (para render correto)
├── exemplos/                         # 3–5 decks finais aprovados (antes/depois se possível)
│   ├── adit-cidades-2026-retrofit/ (fonte.pdf, depois.pdf, notas.md)   # referência do modo evento-de-estudo
│   ├── inc-campinas/ (antes.pptx, depois.pptx, notas.md)
│   └── ...
├── scripts/
│   ├── extract_pptx.py               # → inventario.json
│   ├── extract_pdf.py                # publicação → texto por página, números com página, citações
│   ├── extract_pdf_assets.py         # ilustrações, fotos e logos da publicação → trabalho/assets/
│   ├── render.sh                     # pptx → pdf → thumbs (LibreOffice + pdftoppm)
│   ├── lint_pptx.py                  # checagens do doc 05 §1 → qa.json (inclui T6–T9, D4–D5, E1–E2)
│   ├── qrcode.py                     # gera o QR code do material (qr_code_url)
│   ├── pptx_unpack.py / pptx_repack.py
│   └── build/                        # PptxGenJS: um módulo por tipo de slide
│       ├── capa.js  divisor.js  bignumber.js  grafico_callout.js
│       ├── comparativo.js  mapa.js  texto_consultivo.js  fechamento.js
│       └── build_deck.js             # lê deck_spec.json → .pptx
├── .claude/
│   ├── commands/
│   │   ├── qualificar.md             # /qualificar (arquivo pronto nesta base)
│   │   ├── narrativa.md              # /narrativa — só etapas 0–3
│   │   └── qa.md                     # /qa — só etapa 5 sobre um pptx
│   ├── agents/
│   │   ├── diagnosticador.md
│   │   ├── pesquisador.md            # etapa 1b: atualização, localização, contexto
│   │   ├── roteirista.md
│   │   └── revisor.md
│   └── settings.json
└── jobs/
    └── 2026-10-complan/
        ├── briefing.yaml
        ├── entrada/                  # deck prévio + anexos
        ├── trabalho/                 # inventario.json, fontes.json, atualizacao.md, identidade.md,
        │                             # diagnostico.md, narrativa.md, deck_spec.json, assets/, thumbs/
        └── saida/                    # finais + relatorio.md
```

## 2. Contrato intermediário: `deck_spec.json`

A narrativa aprovada vira um JSON que os scripts de build consomem. Isso separa **conteúdo** (Claude) de **diagramação** (código), e torna o resultado reprodutível.

```json
{
  "meta": { "titulo": "...", "evento": "...", "data": "2026-10-28", "identidade": "brain" },
  "slides": [
    { "tipo": "capa", "titulo": "...", "subtitulo": "...", "evento": "ADIT Cidades 2026", "cidade": "Florianópolis", "palestrante": "Fábio Tadeu Araújo" },
    { "tipo": "metodologia_estudo", "frentes": ["Desk research", "Levantamento de oferta", "..."], "qr_url": "https://..." },
    { "tipo": "divisor", "numero": 1, "nome": "Menos gente, mais domicílios" },
    { "tipo": "bignumber", "titulo": "...", "valor": "34%", "legenda": "...", "fonte": "IBGE, Censo 2022",
      "notas": "fala do slide", "origem": "entrada:slide14" },
    { "tipo": "grafico_callout", "titulo": "...", "grafico": { "tipo": "bar", "categorias": [], "series": [] },
      "callout": "...", "fonte": "...", "origem": "entrada:slide22",
      "etiqueta": "legislação · atualizado 2026", "destaque_titulo": "o seu programa" }
  ]
}
```
O campo `origem` permite ao `lint` (D2) rastrear cada número até a entrada.

## 3. Subagentes (`.claude/agents/`)

| Agente | Função | Ferramentas |
|---|---|---|
| `diagnosticador` | Etapas 1–2: lê inventário/thumbs, produz `diagnostico.md` | Read, Bash, Glob |
| `pesquisador` | Etapa 1b: o que mudou desde a publicação, fatos locais, contexto "por que agora"; grava `atualizacao.md` e `fontes.json` com URL e data | WebSearch, WebFetch, Read, Write |
| `roteirista` | Etapa 6: roteiro de fala e de moderação a partir do deck final | Read, Write |
| `revisor` | Etapa 5: rubrica do doc 05 §2 **sem acesso ao histórico** | Read, Bash |

O orquestrador (sessão principal) faz a narrativa, o `deck_spec.json` e as correções.

## 4. Fluxo do `/qualificar`

```
/qualificar jobs/2026-10-complan
  → valida briefing (pergunta 1x se faltar crítico)
  → scripts/extract_pptx.py | extract_pdf.py + extract_pdf_assets.py + render.sh
  → agente pesquisador (se pode_pesquisar)
  → agente diagnosticador
  → narrativa.md  ── GATE (pula se auto_aprovar)
  → deck_spec.json → build_deck.js  (ou edição XML se cliente-preservado)
  → render.sh + lint_pptx.py + agente revisor  (loop ≤ 3)
  → agente roteirista + versões extras
  → saida/ + relatorio.md
```

## 5. Hooks úteis (`.claude/settings.json`)

- **PostToolUse** em escrita de `.pptx` em `saida/` → roda `lint_pptx.py` automaticamente.
- **Stop** → bloqueia o encerramento se `qa.json` tiver FALHA 🔒 pendente.

## 6. Ordem de implementação sugerida

1. `extract_pptx.py` + `render.sh` (vale sozinho: já acelera o diagnóstico).
2. `CLAUDE.md` + `/narrativa` (etapas 0–3) — já elimina a maioria das idas e vindas.
3. `lint_pptx.py` com M1, M3, M4, T4–T7, D1, E1, V1.
4. Módulos PptxGenJS sobre o template Brain + `build_deck.js`.
5. Agente revisor e loop de QA.
6. Roteirista, versões extras, hooks.
7. Calibrar heurísticas **[calibrar]** com os decks de `exemplos/`.

## 7. Modelo

Ver `07-modelo-api.md`: Sonnet 5.5 como padrão; Opus 5.5 na narrativa (etapa 3) e no agente `revisor`, até que a avaliação comparativa diga o contrário.

## 8. Dependências

Node + `pptxgenjs`; Python + `python-pptx`, `lxml`, `pdfplumber`/poppler (`pdftotext`, `pdfimages`), `qrcode`, `hunspell` pt_BR; LibreOffice (headless) e `poppler-utils` para render; fontes Brain instaladas no sistema para o render não substituir tipografia.
