// Corretor v0.67 — o mesmo empreendimento aparece em fichas, legendas de mapa e
// tabelas de lacunas; os números dele têm de ser os mesmos em todos. Em Rolândia
// (out/2026) a ficha do Boulevard dizia planta única de R$ 5.120/m² com 192
// unidades, e as lacunas punham as 192 em “Até R$ 5.000/m²” (usavam 4.960).
//
// Só texto NATIVO identifica o empreendimento (ficha, legenda): a leitura de
// visão de tabelas de empreendimentos embaralha linhas mescladas (s45) e não é
// âncora segura. As lacunas entram só pela coluna de faixa, que a visão lê bem.

import type { Ir } from '../audit/ir';
import type { Cell, Finding } from '../audit/model';
import { binFromLabel } from '../audit/engine';
import type { CrossTableRef } from './cross-table';

interface Planta { m2: number; precoM2: number }
interface Ficha { slide: number; nome: string; lancada?: number; final?: number; plantas: Planta[] }
interface Legenda { slide: number; nome: string; m2: number; precoM2: number; unidades: number }

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const num = (raw: string) => Number(raw.replace(/\./g, '').replace(',', '.'));
const fmt = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 });

const FICHA_LANCADA = /oferta\s+lan[çc]ada:\s*([\d.]+)/i;
const FICHA_FINAL = /oferta\s+(?:final|atual):\s*([\d.]+)/i;
const FICHA_PLANTA = /(\d+(?:,\d+)?)\s*m²\s*\(\s*R\$\s*([\d.]+(?:,\d+)?)\s*\/\s*m²\s*\)/gi;
const LEGENDA = /^\s*(.+?)\s*\n\s*(\d+(?:,\d+)?)\s*m²\s*\|\s*R\$\s*([\d.]+(?:,\d+)?)\s*\/\s*m²\s*\|\s*([\d.]+)\s*uni/i;

export function fichasOf(ir: Ir): Ficha[] {
  const out: Ficha[] = [];
  for (const s of ir.slides) for (const text of s.textos ?? []) {
    if (!FICHA_LANCADA.test(text)) continue;
    const nome = text.split('\n')[0].split(/\s[-–]\s/)[0].trim();
    if (!nome || nome.length > 40) continue;
    const plantas = [...text.matchAll(FICHA_PLANTA)].map((m) => ({ m2: num(m[1]), precoM2: num(m[2]) }));
    const lancada = FICHA_LANCADA.exec(text)?.[1], final = FICHA_FINAL.exec(text)?.[1];
    out.push({ slide: s.n, nome, lancada: lancada ? num(lancada) : undefined, final: final ? num(final) : undefined, plantas });
  }
  return out;
}

export function legendasOf(ir: Ir): Legenda[] {
  const out: Legenda[] = [];
  for (const s of ir.slides) for (const text of s.textos ?? []) {
    const m = LEGENDA.exec(text);
    if (m) out.push({ slide: s.n, nome: m[1].trim(), m2: num(m[2]), precoM2: num(m[3]), unidades: num(m[4]) });
  }
  return out;
}

const differs = (a: number, b: number) => Math.abs(a - b) > Math.max(1, Math.abs(b) * 0.01);

function attributeConflicts(fichas: Ficha[], legendas: Legenda[]): Finding[] {
  const out: Finding[] = [];
  const names = new Set([...fichas, ...legendas].map((x) => norm(x.nome)));
  for (const key of names) {
    const fs = fichas.filter((f) => norm(f.nome) === key);
    const ls = legendas.filter((l) => norm(l.nome) === key);
    const seen: { attr: string; value: number; slide: number }[] = [];
    // Planta única: m² e R$/m² da ficha são os do empreendimento. Com várias
    // plantas, a legenda mostra média — não dá para comparar.
    for (const f of fs) if (f.plantas.length === 1) {
      seen.push({ attr: 'm²', value: f.plantas[0].m2, slide: f.slide }, { attr: 'R$/m²', value: f.plantas[0].precoM2, slide: f.slide });
    }
    for (const f of fs) if (f.final !== undefined) seen.push({ attr: 'unidades disponíveis', value: f.final, slide: f.slide });
    for (const l of ls) {
      seen.push({ attr: 'unidades disponíveis', value: l.unidades, slide: l.slide });
      if (fs.some((f) => f.plantas.length === 1)) seen.push({ attr: 'm²', value: l.m2, slide: l.slide }, { attr: 'R$/m²', value: l.precoM2, slide: l.slide });
    }
    const conflicts: string[] = [];
    for (const attr of ['m²', 'R$/m²', 'unidades disponíveis']) {
      const vals = seen.filter((v) => v.attr === attr);
      if (vals.some((v) => differs(v.value, vals[0].value))) {
        conflicts.push(`${attr}: ${vals.map((v) => `${fmt(v.value)} (s${v.slide})`).join(', ')}`);
      }
    }
    if (!conflicts.length) continue;
    const nome = (fs[0] ?? ls[0]).nome;
    const slides = [...new Set(seen.map((v) => v.slide))].sort((a, b) => a - b);
    out.push({
      id: `entity-${key}`,
      type: 'CROSS_TABLE_MISMATCH',
      section: 'MERCADO',
      slideRef: slides.map((n) => `s${n}`).join(', '),
      title: `${nome}: dados diferentes entre slides`,
      detail: `O mesmo empreendimento aparece com números diferentes — ${conflicts.join('; ')}.`,
      ok: false,
      confidence: 2,
      origem: 'DET',
      viz: { kind: 'text', evidence: conflicts.join('; ') },
    });
  }
  return out;
}

const isPriceM2Bin = (label: string) => /r\$/i.test(label) && /m[²2]/i.test(label);
const colTotal = (rows: Cell[][], totals: Cell[] | undefined, i: number) =>
  typeof totals?.[i] === 'number' ? (totals[i] as number) : rows.reduce((s, r) => s + (typeof r[i] === 'number' ? (r[i] as number) : 0), 0);

function lacunaBinMismatches(fichas: Ficha[], refs: CrossTableRef[]): Finding[] {
  const out: Finding[] = [];
  // Escopo: a lacuna precisa cobrir os MESMOS empreendimentos das fichas. Lacuna
  // de um segmento (“Compactos”, SJC s81) ou de outro recorte não tem por que
  // conter cada ficha. Total lançado do bloco entre 90% e 100% da soma das fichas
  // (exclusão de garden/duplex derruba um pouco; Rolândia: 288 de 292).
  const fichasTotal = fichas.reduce((s, f) => s + (f.lancada ?? 0), 0);
  const blocks = refs.filter((r) => {
    if ((r.secao ?? '').toUpperCase() !== 'LACUNAS' || !/oferta\s+lan[çc]ada/i.test(r.table.title ?? '')) return false;
    // Visão do modelo econômico desloca valores entre faixas sem quebrar a soma
    // (SJC s77, gpt-4o-mini): só leitura do gpt-4o sem discordância é âncora.
    if (r.source === 'vision' && !r.reliable) return false;
    const total = r.table.columns.findIndex((c) => /^total$/i.test(String(c ?? '').trim()));
    if (total < 0 || r.table.rows.some((row) => row.length !== r.table.columns.length)) return false;
    const grand = colTotal(r.table.rows, r.table.totals, total);
    // Alinhamento provado: as faixas somam a coluna Total. Leitura deslocada uma
    // coluna (SJC s77: 672 lido em “R$ 5.001–6.000”) não fecha e fica de fora.
    const binSum = r.table.columns.reduce<number>((s, c, i) => (i !== total && isPriceM2Bin(String(c ?? '')) ? s + colTotal(r.table.rows, r.table.totals, i) : s), 0);
    if (Math.abs(binSum - grand) > 1) return false;
    return fichasTotal > 0 && grand >= fichasTotal * 0.9 && grand <= fichasTotal;
  });
  for (const f of fichas) {
    if (f.plantas.length !== 1 || !f.lancada) continue;
    const { precoM2 } = f.plantas[0];
    const hits: string[] = [];
    for (const ref of blocks) {
      const bins = ref.table.columns.map((c, i) => ({ i, label: String(c ?? ''), bin: isPriceM2Bin(String(c ?? '')) ? binFromLabel(String(c ?? '')) : null }))
        .filter((b) => b.bin);
      if (bins.length < 2) continue;
      const inBin = ({ from, to }: { from: number; to: number | null }) =>
        to === null ? precoM2 > from : precoM2 >= from && precoM2 <= to;
      const home = bins.find((b) => inBin(b.bin!));
      if (!home) continue;
      const have = colTotal(ref.table.rows, ref.table.totals, home.i);
      if (have >= f.lancada) continue;
      const elsewhere = bins.find((b) => b !== home && colTotal(ref.table.rows, ref.table.totals, b.i) >= f.lancada!);
      hits.push(`s${ref.slide}: “${home.label}” tem ${fmt(have)} unidade(s)${elsewhere ? ` e “${elsewhere.label}” tem ${fmt(colTotal(ref.table.rows, ref.table.totals, elsewhere.i))}` : ''}`);
    }
    if (!hits.length) continue;
    const slides = [f.slide, ...hits.map((h) => Number(h.slice(1, h.indexOf(':'))))];
    out.push({
      id: `entity-bin-${norm(f.nome)}`,
      type: 'CROSS_TABLE_MISMATCH',
      section: 'LACUNAS',
      slideRef: [...new Set(slides)].map((n) => `s${n}`).join(', '),
      title: `${f.nome}: faixa de R$/m² das lacunas não bate com a ficha`,
      detail: `A ficha (s${f.slide}) dá planta única de R$ ${fmt(precoM2)}/m² com ${fmt(f.lancada)} unidades lançadas, mas ${hits.join('; ')}. A tabela de lacunas parece usar outro R$/m² para este empreendimento.`,
      ok: false,
      confidence: 2,
      origem: 'DET',
      viz: { kind: 'text', evidence: hits.join('; ') },
    });
  }
  return out;
}

// ── Linha da tabela de empreendimentos ──────────────────────────────────────
// Empreendimento com várias tipologias ocupa várias sub-linhas (nome mesclado na
// primeira). Por empreendimento: unidades por tipologia somam a oferta lançada;
// disponibilidade = atual ÷ lançada; preço ÷ R$/m² dá a área da linha.

const colOf = (cols: string[], rx: RegExp) => cols.findIndex((c) => rx.test(c));
const n = (v: Cell) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

function projectRowIssues(ref: CrossTableRef, hasExclusionNote: boolean): Finding[] {
  const cols = ref.table.columns.map((c) => norm(String(c ?? '')));
  const name = colOf(cols, /^empreendimento/), lan = colOf(cols, /oferta lan[cç]ada/), atu = colOf(cols, /oferta (?:atual|final)/);
  const disp = colOf(cols, /^disp/), units = colOf(cols, /unidades/), price = colOf(cols, /^preco/);
  const area = colOf(cols, /^m² ?\(priv|^area priv|^m²$/), pm2 = colOf(cols, /r\$ ?\/ ?m²/);
  if (name < 0 || lan < 0) return [];
  const groups: { nome: string; rows: Cell[][] }[] = [];
  for (const row of ref.table.rows) {
    const label = String(row[name] ?? '').trim();
    if (/^total/i.test(label)) break;
    if (label) groups.push({ nome: label, rows: [row] });
    else if (groups.length) groups[groups.length - 1].rows.push(row);
  }
  const issues: string[] = [];
  for (const g of groups) {
    const lancada = n(g.rows[0][lan]);
    if (lancada === null) continue;
    if (units >= 0) {
      const sum = g.rows.reduce((s, r) => s + (n(r[units]) ?? 0), 0);
      if (sum > 0 && Math.abs(sum - lancada) > 0.5) {
        issues.push(`${g.nome}: unidades por tipologia somam ${fmt(sum)}, a oferta lançada é ${fmt(lancada)}`);
      }
    }
    const atual = atu >= 0 ? n(g.rows[0][atu]) : null, d = disp >= 0 ? n(g.rows[0][disp]) : null;
    if (atual !== null && d !== null && lancada > 0) {
      const expected = (atual / lancada) * 100;
      if (Math.abs(expected - d) > 0.15) issues.push(`${g.nome}: disponibilidade ${fmt(d)}%, mas ${fmt(atual)} ÷ ${fmt(lancada)} = ${fmt(expected)}%`);
    }
    if (price >= 0 && area >= 0 && pm2 >= 0) for (const r of g.rows) {
      const p = n(r[price]), a = n(r[area]), m = n(r[pm2]);
      // Área é arredondada no slide: a régua é a área implícita, com folga de 1 m².
      if (p && a && m && Math.abs(p / m - a) > 1) {
        issues.push(`${g.nome}: R$ ${fmt(p)} ÷ R$ ${fmt(m)}/m² = ${fmt(p / m)} m², o slide mostra ${fmt(a)} m²`);
      }
    }
  }
  if (!issues.length) return [];
  // Exclusão declarada (garden/duplex fora) explica unidade a menos, não a mais.
  const onlyUnits = issues.every((i) => /unidades por tipologia/.test(i));
  return [{
    id: `project-rows-s${ref.slide}-${norm(ref.table.title ?? '').slice(0, 24)}`,
    type: 'CROSS_TABLE_MISMATCH',
    section: 'MERCADO',
    slideRef: `s${ref.slide}`,
    title: 'Números da linha do empreendimento não fecham',
    detail: `${issues.join('; ')}.${hasExclusionNote && onlyUnits ? ' O slide declara exclusão de unidades (garden/duplex/cobertura): confira se a diferença é essa.' : ''}`,
    ok: false,
    confidence: hasExclusionNote && onlyUnits ? 3 : 2,
    origem: ref.source === 'vision' ? 'IA_visao' : 'DET',
    evidenceSha1: ref.source === 'vision' ? ref.sha1 : undefined,
    viz: { kind: 'text', evidence: issues.join('; ') },
  }];
}

const EXCLUSION_NOTE = /garden|duplex|cobertura/i;

export function entityConsistencyFindings(ir: Ir, refs: CrossTableRef[]): Finding[] {
  const fichas = fichasOf(ir);
  const noteOf = (slide: number) => (ir.slides.find((s) => s.n === slide)?.textos ?? []).some((t) => EXCLUSION_NOTE.test(t));
  // Sub-linhas mescladas são o que a visão mais erra: o mini embaralhou o s45 de
  // Rolândia e até o gpt-4o perdeu a 2ª sub-linha no s123 do Toledo (45+45 lido
  // como 45). Só tabela nativa tem a estrutura de linhas confiável.
  const projectTables = refs.filter((r) => r.source === 'ir');
  return [
    ...attributeConflicts(fichas, legendasOf(ir)),
    ...lacunaBinMismatches(fichas, refs),
    ...projectTables.flatMap((r) => projectRowIssues(r, noteOf(r.slide))),
  ];
}
