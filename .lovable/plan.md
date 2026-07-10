## Correções na página "Validação do Fechamento"

### 1. Corrigir deslocamento de mês (mar/26 → fev/26)

**Causa:** `h.periodDate` é criado via `new Date("2026-03-01")`, que o JS interpreta em UTC. Em fusos negativos (BRT −3), `getMonth()` devolve o mês anterior — por isso `mar/26` aparece como `fev/26`.

**Correção em `src/features/validacao-fechamento/aggregate.ts`, dentro de `flattenBuildings`:** derivar `periodKey`, `bucketYear`, `bucketQuarter`, `bucketMonth` diretamente da string `h.period` (formato `YYYY-MM-DD`), sem passar por `Date`.

Helpers novos, string-based:

```ts
function parsePeriodParts(s: string): { y: number; m: number } {
  const [y, m] = s.replaceAll('/', '-').split('-').map((p) => parseInt(p, 10));
  return { y, m };
}
const periodKeyFromStr   = (s: string) => { const {y,m}=parsePeriodParts(s); return `${y}-${String(m).padStart(2,'0')}`; };
const bucketYearFromStr  = (s: string) => String(parsePeriodParts(s).y);
const bucketQuarterFromStr = (s: string) => { const {y,m}=parsePeriodParts(s); return `${String(Math.floor((m-1)/3)+1).padStart(2,'0')}T/${String(y).slice(-2)}`; };
const bucketMonthFromStr = (s: string) => { const {y,m}=parsePeriodParts(s); return `${MONTH_LABEL[m-1]}/${String(y).slice(-2)}`; };
```

Substituir no push da row (e aplicar o mesmo tratamento a `b.release_date` para relKey/relY/relQ/relM). `periodDate` continua no tipo apenas como referência opcional.

### 2. Cabeçalho verde na coluna "% Var. Total"

Em `src/features/validacao-fechamento/fechamento.css`, o seletor `.vf-total` está pintando também o `<th>` do cabeçalho de amarelo. Escopar o amarelo somente ao corpo e forçar o header em verde primário:

```css
.validacao-fechamento table.vf-resumo tbody tr.vf-total { background: var(--vf-accent-soft); font-weight: 700; }
.validacao-fechamento table.vf-resumo thead th.vf-total { background: var(--vf-primary); color: #fff; }
```

### 3. Linha de filtros ativos abaixo do Top Header

Adicionar uma barra fina imediatamente abaixo do `VFHeader` mostrando, em linha única, os filtros aplicados pelo usuário.

- Novo componente `src/features/validacao-fechamento/ActiveFiltersBar.tsx`, sticky, altura ~28px, fonte 10pt, cor `var(--vf-muted)`, borda inferior `var(--vf-border)`, fundo `var(--vf-card)`, com `overflow-x:auto` e `white-space:nowrap` para caber em uma única linha.
- Formato: `Cidade: Joinville/SC · Granularidade: Anual · Ano: 2024, 2025 · Trimestre: — · Período: jan/26, fev/26 · Padrão: Alto · Tipo: Vertical · Empreendimentos: 3 selecionados`.
  - Omitir chaves sem seleção OU renderizar `—` para deixar claro (usar `—` para as chaves obrigatórias: Cidade, Granularidade; omitir as demais quando vazias).
  - Quando `buildings` tiver mais de 3 seleções, mostrar `N selecionados`; até 3, listar por nome.
  - Botão discreto "Limpar filtros" à direita (só aparece se houver algum filtro dimensional/temporal ativo) chamando `setFilters(EMPTY_VF_FILTERS)`.
- Integrar em `src/pages/ValidacaoFechamento.tsx` logo após `<VFHeader … />`, recebendo `scope`, `granularity`, `filters` e `options` (para mapear `building_id → nome`).

Nenhuma outra alteração de comportamento.
