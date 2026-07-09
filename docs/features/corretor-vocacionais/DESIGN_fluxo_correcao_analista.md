# Fluxo de correção do analista — Design (6f)

Conceito acordado em 2026-07-09 (Gabriel + Claude). Base para repensar o teste e a
interface do Corretor a partir do **trabalho real do analista**, não da avaliação do arquivo.

## Quem usa e quando

- **Analista de Mercado** — elabora o relatório (PPTX). **É o usuário do corretor.**
- **Analista A&R** (Análise & Recomendação) — recebe o relatório elaborado e escreve os textos
  e recomendações finais.
- **A correção acontece ANTES do handoff**: o estudo deve chegar ao A&R com o **mínimo de erros**.
  O corretor é o **pré-flight** do analista de mercado sobre o próprio arquivo.

## Reframe central: worklist até zero (não relatório de auditoria)

O objetivo não é *entender* os erros — é **zerar os pendentes antes de entregar**. Motor mental =
o "0 problems" da IDE. Implicações:

1. Cada achado tem um **estado que o analista controla** (ver §Status).
2. "Pronto para entregar" = **0 pendentes**. A tela mostra **progresso rumo a zero**.
3. A tela responde **"o quê e onde"** para o analista **pular ao slide no PowerPoint e corrigir
   à mão**. Logo: **número do slide + thumbnail** são de primeira classe, sempre.

## Duas famílias de erro → arranjo da tela

A escolha "por tipo × sequencial" se dissolve ao separar por família:

| Família | Exemplos | Mora em | Correção |
|---|---|---|---|
| **Local** | nota vazada, fonte ausente, ortografia, soma de UMA tabela | um slide | **sequencial por slide** |
| **Relacional** | mesma renda entre slides, total de lacunas divergente, janela temporal, raio estranho | uma relação A↔B | **por tipo** (comparação A×B) |

**Arranjo padrão (decidido):** **sequencial por slide** (espinha, erros locais em ordem numérica)
**+ seção "erros entre slides"** (relacionais, agrupados por tipo). **Filtro por tipo** como lente
alternativa (movimento "batedora": resolver as N fontes ausentes numa passada).

> Nota de fase: com PPTX **só imagem**, os achados de hoje são quase todos **locais** (nota,
> fonte, raios, estrutura) — o sequencial já serve. A seção relacional cresce quando entrarem
> tabelas nativas/visão (números destravados).

## Status do achado (decidido: híbrido)

Estados: `pendente` · `corrigido` · `ignorado` (falso positivo **ou** justificado/won't-fix).

- **Manual:** o analista marca conforme trabalha (progresso imediato, sem re-subir).
- **Re-check reconcilia:** ao subir a versão corrigida, o corretor confirma — o que sumiu vira
  `corrigido` de fato; o que persiste volta a `pendente`.
- "Pronto" = 0 `pendente` (ignorados justificados não contam).

## O loop de re-check (coração do 6f)

Hoje a v2 avalia **uma vez**. O fluxo real é iterativo:

```
sobe PPTX → worklist de achados → corrige no PowerPoint → sobe a versão nova
      → corretor faz DIFF → "resolvidos / persistentes / novos" → repete até zero
```

**Identidade estável do achado** viabiliza o diff: os IDs das regras sobre o IR já são
determinísticos por conteúdo (`note-<slide>-<i>`, `src-<slide>`, `radii-<slide>`), então
v1→v2 do arquivo casam por set difference de IDs. Corrigiu a nota do slide 41 → `note-41-0`
some → conta como resolvido.

## Estratégia de teste (o que 6f entrega, melhor que "avaliar o arquivo todo")

Reproduzir a **sessão de correção**, não a avaliação única:

1. Subir um PPTX real com erros conhecidos (Itajaí/Marka têm **gabarito** — as notas do analista).
2. Simular a sessão: percorrer a worklist, marcar corrigido/ignorado, **re-subir** a versão corrigida.
3. Verificar o **loop fechando**: o corretor confirma menos erros a cada rodada.

**Métricas** (norte, não "quantos erros achou"):
- **Tempo-até-zero** (esforço da sessão).
- **Erros residuais que chegariam ao A&R** (deve → 0).
- **Taxa de falso positivo** (achados que o analista descartou) — alimenta a calibração.

## Por onde começar (slices)

1. **Worklist** — reorganizar a v2 em: espinha sequencial por slide (locais) + seção relacional
   por tipo + filtro por tipo. Reaproveita os achados/visualizações que já existem.
2. **Status híbrido** — `pendente/corrigido/ignorado` por achado, persistido, com barra de
   progresso rumo a zero.
3. **Re-check/diff** — segundo upload → diff de IDs → "resolvidos / persistentes / novos".
4. **Instrumentar o teste** — rodar a sessão simulada no Itajaí/Marka e medir tempo-até-zero,
   residual e FP.

Ordem por dependência: 1 → 2 → 3 → 4. Slice 1 já vale sozinho (deixa a tela no formato do fluxo).

### Slice 1 — feito (2026-07-09)

`AuditoriaV2Page` reorganizada em worklist: **espinha sequencial por slide** (erros locais,
ordem numérica, agrupados por slide) + **seção "Erros entre slides"** (relacionais, por tipo) +
**filtro** (Sequencial ↔ por tipo). Split local/relacional via `isLocal` (slideRef `sNN` = local;
`×`/`—`/`ata` = relacional). Validado nos dados reais: Itajaí 6 locais (5 slides) + 4 relacionais;
Marka 11 locais + 1 relacional. Próximo: Slice 2 (status híbrido + progresso a zero).

## Relação com 6g (repensar a interface)

Este doc é o **lente de workflow** que informa o 6g (redesenho de ponta a ponta: 2ª aba lateral
de projetos → comunicação de erros). Regra: **desenhar a interface a partir do fluxo acima**,
não o contrário.
