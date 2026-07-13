# PLAN — Corretor v5: fluxo ideal (portão da ata → triage → correção → entrega → calibração)

**Data:** 2026-07-13 · **Autores:** Gabriel + Claude · **Executor:** Opus
**Origem:** análise de produto pós-v4 (conversa 13/jul). Benchmarks: GitHub PR review,
Grammarly, Linear, Figma, ferramentas de attestation/auditoria.
**Tese:** o corretor hoje é um *linter com relatório* — roda uma vez e entrega uma lista.
O v5 o aproxima de um *companheiro de sessão*: a ata parametriza tudo ANTES de gastar,
triage e correção viram modos distintos, a entrega gera um artefato de confiança, e o loop
de calibração ganha uma vista própria. A **reconferência contínua (file watch)** fica como
implementação FUTURA (§WS-F), com a estratégia de transição descrita no WS-5.

Leia antes: `DESIGN_uiux_corretor_v4.md` (implementado), `REVIEW_coverage_90_ajustes.md`,
`OPERACAO_coverage_90.md` (homologação ainda pendente), `LIVE_regras_corretor_vocacionais.md`
(v0.29–0.33). Regras de sempre: atualizar o LIVE doc por WS; testes para função pura nova;
nenhum PPTX versionado; custo de IA novo só com estimativa atualizada.

## Estado de partida (verificado no código em 13/jul, pós-v0.33)

- Passo único: DET → ata → texto+visão (paralelo) → cruzamentos, com custo vivo e abort.
- UI v4: 3 abas (Completude/Problemas/Por slide), confiança 1/2/3, FP verdict, entrega gradada.
- **Cidade do estudo nasce `null` no upload** (`CorretorV3Page.tsx` `ingestNew` →
  `analyzeStudy({ cidade: null, … })`) e só é preenchida se a ata for encontrada/extraída —
  sem ata, `CITY_NAME`/`WRONG_CONTEXT` rodam sem referência. O WS-1 fecha esse buraco.
- Fix não commitado no working tree: `wl.completeness → wl.completude` (crash da aba padrão,
  corrigido pelo Claude em 13/jul + `tsc --noEmit` limpo). **Commitar no WS-0.**
- Homologação do Coverage 90 (deploy da edge + Marka/Itajaí/GO + recall real) **ainda não
  rodou** — é pré-requisito para calibrar qualquer número novo de UI, mas NÃO bloqueia os
  WS deste plano (são de fluxo, não de regra).

## Ordem e tamanho

| WS | Entrega | Valor | Esforço |
|---|---|---|---|
| 0 | Higiene: commit do fix, typecheck no build, 5 ajustes da revisão v0.33 | destrava | P |
| 1 | Portão da ata (extrair → confirmar → só então gastar) | altíssimo | M |
| 2 | Relatório de entrega (attestation) | alto | M |
| 3 | Modo triage por teclado | alto p/ escala | M |
| 4 | Estratégia pré-watch: reconferência sem atrito | médio | P–M |
| 5 | Vista da calibradora (fila de FP + saúde por regra) | médio | M |
| F | (FUTURO) Reconferência contínua via File System Access | — | não fazer agora |

---

## WS-0 — Higiene (fazer primeiro, meio dia)

1. **Commitar** o fix `wl.completude` que está no working tree (autoria: revisão 13/jul).
2. **Typecheck no pipeline:** `package.json` → `"build": "tsc --noEmit && vite build"`
   (ou script `check` + CI). O crash da v0.33 teria sido pego por isso.
3. Ajustes menores apontados na revisão do commit `561f7f9`:
   a. `DeckRuler`: `grid-cols-16/20` não existem no Tailwind — usar
      `style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(28px, 1fr))' }}`.
   b. `projectionFindings`: trocar a guarda `futuros > metade` por
      `Math.max(...years) >= currentYear + 3` (tabela com histórico longo + projeção
      legítima estava sendo pulada — falso negativo).
   c. `structureChecklistFinding`: substituir `slice(5)` por exclusão de slides cuja
      `secao_canonica` é capa/sumário (ou sem seção e n ≤ 3). Endereço no slide 4 não pode
      virar "missing".
   d. `confidenceOf`: `WRONG_CONTEXT` nível 1 **somente** quando a evidência é literal do
      texto (regra de UF) ou leitura escalonada; vindo de visão mini não confirmada → nível 2.
      (Passar `origem`/`escalated` já disponíveis.)
   e. Estágio `cruzamento` persiste com origem `IA_visao` mesmo quando ambos os lados são
      tabelas nativas → origem `DET` nesses casos (o `CrossTableRef.source` já diz).

## WS-1 — Portão da ata (a mudança de maior alavancagem)

**Padrão de produto:** confirmação humana no parâmetro que contamina todo o resto
(cidade/UF/pedidos), ANTES de gastar visão/texto. Um clique aqui vale mais que qualquer
heurística depois.

### Fluxo novo

```
upload .pptx
  → IR + DET (grátis, instantâneo — pinga na worklist como hoje)
  → ata: localizar + extrair (barato, ~R$0,05; cache já existe)
  → CARD DE CONFIRMAÇÃO (bloqueia os passes pagos):
      "Guarulhos / SP"  [editável]
      produto: 2 torres · 2 dorms · 45–65m²   [editável, colapsado]
      pedidos da ata: lacunas de vagas; distância aeroporto…  [lista editável]
      [Confirmar e analisar (R$ X,XX)]   [Analisar sem ata →]
  → texto + visão + cruzamentos com a cidade CONFIRMADA
```

### Implementação

1. **`pipeline.ts`** — dividir `runFullAnalysis` em duas fases exportadas:
   - `runPhase1(bytes, ir, opts)` → `{ detFindings, ata, ataCost… }` (DET + ata; hoje é o
     começo da função — extrair, não duplicar);
   - `runPhase2(bytes, ir, { ataConfirmada, city, … })` → texto+visão+cruzamentos (o resto,
     recebendo a ata JÁ confirmada/edita em vez de extrair).
   Manter `runFullAnalysis` como composição das duas para os testes existentes.
2. **Card `AtaGateCard`** (novo componente; base no `AtaCard`):
   - campos cidade/UF editáveis (input + select de UF), produto e pedidos editáveis
     (textarea/linhas). Mostra `localizacao_fonte` como apoio ("a ata diz: …").
   - botão principal com o custo estimado da fase 2 (a estimativa já existe em
     `estimateFullAnalysis` — exibir `texto+visão`);
   - **caminho sem ata:** se `findAtaImage` não achar candidata, o card vira um formulário
     mínimo obrigatório: "Qual a cidade/UF do estudo?" — resolve o buraco do `cidade: null`.
3. **Persistência:** salvar a ata editada via `saveAta` já existente + flag
   `ata_confirmada boolean` em `studies_v3` (migration pequena). Reaberturas de estudo com
   flag true não mostram o portão de novo.
4. **BudgetModal** continua valendo: se a fase 2 estourar o teto, o modal aparece após a
   confirmação (não antes — o portão já mostra o custo).
5. **Edição da ata re-parametriza:** trocar a cidade no card e confirmar → fase 2 roda com a
   nova cidade; se o estudo já tinha achados de cidade (re-análise), os `CITY_NAME`/
   `WRONG_CONTEXT` antigos são invalidados no recheck normal (IDs estáveis cuidam disso).

### Aceite

- Upload do Marka: portão mostra "São Paulo/SP" errado? Não — a ata diz Guarulhos; o card
  exibe Guarulhos/SP + pedidos; confirmar dispara o resto; total de cliques: 1.
- Upload de um PPTX sem ata: formulário pede cidade/UF antes de qualquer gasto.
- Custo da ata aparece no card; nenhuma chamada de visão/texto antes da confirmação.

## WS-2 — Relatório de entrega (attestation)

**Padrão:** test runner mostra "132 passed", não só os failed. Auditoria entrega um
relatório do que FOI verificado. Hoje os findings `ok: true` são descartados
(`filter((f) => !f.ok)`) — são exatamente a matéria-prima da confiança.

1. **Persistir o sumário da análise** no momento do passo único: migration
   `studies_v3.relatorio jsonb` com
   `{ tabelasVerificadas, tabelasComErro, cruzamentosOk, cruzamentosErro, raiosOk, slides,
   custoUsd, porTipo: {tipo: {ok, erro}}, geradoEm }` — os números já existem no retorno de
   `runVisionPass`/`irToFindings` (não recalcular depois; salvar junto do `saveAta`).
2. **Na entrega** (`handleConclude` → `concludeStudy`): congelar também
   `{ corrigidos, ignorados, fps, verificarAssumidos }` (contagens de `findings_v3`).
3. **Página/rota read-only `/corretor/:id/relatorio`:** cabeçalho do estudo (nome, cidade,
   versões, custo), blocos "Verificado ✓" (n tabelas fecham, cruzamentos consistentes, raios,
   estrutura), "Corrigido" (lista por tipo com slide), "Assumido com justificativa" (nível 3
   entregues abertos), rodapé "Gerado pelo Corretor em DD/MM". Estilo imprimível (CSS print).
   Botão "copiar link" no selo de entregue.
4. **Aceite:** entregar um estudo gera relatório com números reais e acessível depois por
   link; um estudo antigo (sem `relatorio`) mostra a versão degradada só com contagens de
   findings.

## WS-3 — Modo triage por teclado

**Padrão Linear/Superhuman:** decidir rápido é um modo; corrigir é outro.

1. **Entrada:** botão "Triar N achados" no header quando existem pendentes não triados.
   Estado local (não precisa de coluna nova): triagem percorre os pendentes ordenados por
   confiança (1→3) e, dentro do nível, por grupo/slide.
2. **UI:** um card por vez, grande, com evidência aberta; barra de progresso "12 de 47";
   teclas — `Enter/→` aceitar (mantém pendente, avança) · `F` não é erro (FP) · `I` ignorar ·
   `C` já corrigi · `←` voltar · `G` aceitar o GRUPO inteiro (quando o card pertence a um
   grupo, mostrar "e mais 14 iguais — G para decidir todos").
3. **Saída:** resumo da triagem ("aceitos 25 · FP 6 · ignorados 4") → cai na aba Por slide
   filtrada nos aceitos.
4. **Detalhes:** `useEffect` de keydown com guard para inputs; acessível (foco visível);
   funciona com mouse também (botões espelham as teclas).
5. **Aceite:** dá para triar o Marka inteiro sem tocar no mouse; nenhuma tecla dispara com
   um input focado; o fluxo de status/verdict persiste igual ao dos cards normais.

## WS-4 — Estratégia pré-watch: reconferência sem atrito

Enquanto o file watch (WS-F) não vem, reduzir o custo do loop manual ao mínimo:

1. **Drop = reconferir:** com um estudo aberto, arrastar um arquivo sobre a área de trabalho
   dispara `handleRecheck` (hoje o drop só existe na home para estudo novo). Banner claro:
   "Soltar para reconferir a v3 de {nome}".
2. **Reconferir grátis é explícito:** quando o diff só precisa de DET (nenhuma imagem nova
   pelo sha1), o botão mostra "Reconferir (R$ 0)". A estimativa por sha1 já existe
   (`estimateVisionPass.cached`) — reusar.
3. **Pós-recheck:** toast com o resultado ("7 resolvidos · 2 persistem · 1 novo") e scroll
   para o diff banner; itens resolvidos ganham ✓ com animação discreta (reforço positivo).
4. **Preparação arquitetural para o watch:** extrair de `handleRecheck` uma função
   `recheckFromBytes(bytes: Uint8Array)` independente da fonte (input, drop, futuro handle).
   É o único requisito estrutural que o WS-F precisa de agora.
5. **Aceite:** ciclo salvar-no-PowerPoint → arrastar → diff leva <15s e R$0 quando nada de
   imagem mudou.

## WS-5 — Vista da calibradora

**Objetivo:** fechar o loop do botão "Não é erro" — hoje o veredito persiste e morre.

1. **Rota `/corretor/calibracao`** (ou aba no rail para quem tem papel — decisão de acesso
   com o Gabriel): tabela de findings com `verdict = 'fp'` de TODOS os estudos
   (query em `findings_v3` join `studies_v3`), agrupados por `tipo`, com evidência
   (viz/imagem) e link para o estudo.
2. **Saúde por regra:** para cada tipo do catálogo: nº achados, % FP, % corrigidos —
   dá à Juliana o ranking do que está gritando à toa. (É contagem SQL simples; sem gráfico
   sofisticado nesta rodada — tabela ordenável resolve.)
3. **Ação da calibradora:** marcar FP como "reconhecido" (nova coluna
   `verdict_revisado boolean default false`) para separar fila nova de fila tratada; o
   ajuste de tolerância em si continua sendo mudança de código (registrar no LIVE doc).
4. **Aceite:** Juliana abre a rota, vê os FPs do Marka agrupados, reconhece um grupo e a
   fila reflete; export CSV mantido.

---

## WS-F — FUTURO: reconferência contínua (File System Access API)

**Não implementar nesta rodada.** Registrado para não perder o design:

- `showOpenFilePicker` no momento do upload → persistir o `FileSystemFileHandle` em
  IndexedDB junto do estudo; poll leve de `file.lastModified` (2–5s) enquanto a área de
  trabalho está aberta; mudança → `recheckFromBytes` automático (DET grátis; visão só em
  sha1 novo). Re-pedir permissão ao reabrir a sessão (`queryPermission`/`requestPermission`).
- Suporte: Chrome/Edge (ok), Firefox/Safari (não) → o fluxo do WS-4 é o fallback permanente,
  por isso ele vem antes.
- Alternativa de longo prazo (avaliar depois do watch): add-in do PowerPoint (Office.js)
  para marcar/saltar para o slide direto do card — tratar como projeto separado.
- **Gatilho para tirar do futuro:** WS-1–WS-4 entregues + homologação do Coverage 90
  concluída + demanda real de mais de um analista usando semanalmente.

## Decisões de produto pendentes (Gabriel)

1. Quem vê a rota da calibradora (todos × papel específico)?
2. Relatório de entrega: link interno apenas, ou algum dia exportar PDF para o cliente?
3. Portão da ata: o "Analisar sem ata" exige cidade manual (proposta) ou permite pular
   totalmente (não recomendado — CITY_NAME fica cego)?

## Sequência recomendada de commits

1. WS-0 (higiene) — 1 commit.
2. WS-1 (portão) — pipeline split + card + migration `ata_confirmada`.
3. WS-2 (relatório) — migration `relatorio` + rota.
4. WS-3 (triage) — UI pura, sem migration.
5. WS-4 (recheck sem atrito) — UI + refactor `recheckFromBytes`.
6. WS-5 (calibradora) — migration `verdict_revisado` + rota.

Cada WS: entrada no `LIVE_regras_corretor_vocacionais.md` (v0.34+), testes das funções
puras novas (split do pipeline tem que manter `pipeline-det.test.ts` verde) e, nos WS com
migration, nota no `OPERACAO_coverage_90.md` ou sucessor sobre o SQL a aplicar.
