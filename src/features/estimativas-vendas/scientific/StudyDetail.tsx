import { useMemo, useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { METHODS, type StudyCase, type StudyDataset, type StudyResult } from './study';
import { formatNumber, methodColor } from './format';
import { monthIndex, shiftMonth } from '../expanded/contract';
import type { Building } from '../source';

const parameterLabels: Record<string, string> = { trainedThrough: 'Dados de treino até', pattern: 'Padrão', peers: 'Empreendimentos comparáveis', pool: 'Grupo da referência', k: 'Forma da curva (k)', windowMonths: 'Janela histórica em meses', netRate: 'Redução média do estoque em unidades por mês' };

function reportRows(building: Building, cutoff: string, through: string, scale: 'stock' | 'percent') {
  const months = new Map<string, { units: number; stock: number; valid: boolean; ids: Set<string> }>();
  for (const row of building.typologies_history) {
    const month = row.period.slice(0, 7);
    if (month < shiftMonth(cutoff, -12) || month > through) continue;
    const item = months.get(month) ?? { units: 0, stock: 0, valid: true, ids: new Set<string>() };
    if (item.ids.has(String(row.typology_id))) item.valid = false;
    item.ids.add(String(row.typology_id));
    item.valid &&= row.qty !== null && row.typology_stock !== null && Number.isSafeInteger(Number(row.qty)) && Number(row.qty) > 0 && Number.isSafeInteger(Number(row.typology_stock)) && Number(row.typology_stock) >= 0 && Number(row.typology_stock) <= Number(row.qty);
    item.units += Number(row.qty); item.stock += Number(row.typology_stock); months.set(month, item);
  }
  return [...months].map(([month, row]) => ({ month, value: row.valid ? scale === 'stock' ? row.stock : 100 * (row.units - row.stock) / row.units : null }));
}

export function StudyDetail({ item, dataset, result, onClose }: { item: StudyCase; dataset: StudyDataset; result: StudyResult; onClose: () => void }) {
  const [scale, setScale] = useState<'stock' | 'percent' | 'net'>('stock');
  const [visible, setVisible] = useState<string[]>(METHODS.filter(m => item.methods[m.id].forecast).map(m => m.id));
  const [showMath, setShowMath] = useState(false);
  const building = dataset.buildings.find(b => String(b.building_id ?? b.id) === item.id)!;
  const maxHorizon = Math.max(...result.protocol.horizons);
  const through = shiftMonth(item.cutoff, maxHorizon);
  const rows = useMemo(() => {
    const from = shiftMonth(item.cutoff, -12);
    const data = Array.from({ length: monthIndex(through) - monthIndex(from) + 1 }, (_, i) => ({ month: shiftMonth(from, i) } as Record<string, string | number | null>));
    for (const r of data) { r.history = null; r.actual = null; for (const m of METHODS) r[m.id] = null; }
    for (const r of reportRows(building, item.cutoff, through, scale === 'percent' ? 'percent' : 'stock')) {
      const row = data.find(d => d.month === r.month)!;
      if (scale !== 'net') {
        row[r.month <= item.cutoff ? 'history' : 'actual'] = r.value;
        if (r.month === item.cutoff) row.actual = r.value;
      }
    }
    for (const m of METHODS) for (const p of item.methods[m.id].forecast?.points ?? []) {
      const row = data.find(d => d.month === p.period);
      if (row) row[m.id] = scale === 'stock' ? p.stock : p.predicted === null ? null : scale === 'net' ? p.predicted - item.inventory.sold! : 100 * p.predicted / item.inventory.units!;
    }
    if (scale === 'net') {
      for (const t of result.trials.filter(t => t.id === item.id && t.cutoff === item.cutoff && t.target === 'net' && t.actual !== null)) {
        const row = data.find(d => d.month === t.targetMonth); if (row) row.actual = t.actual;
      }
    }
    return data;
  }, [building, item, through, scale, result]);
  const trials = result.trials.filter(t => t.id === item.id && t.cutoff === item.cutoff);
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}><DialogContent className="ev-modal ev-science-detail"><DialogTitle>{item.inventory.name}</DialogTitle><DialogDescription>Curitiba/PR · {item.inventory.type} · ID {item.id} · previsão com dados até {item.cutoff}</DialogDescription>
    <div className="ev-science-facts"><p>Meses desde lançamento<strong>{formatNumber(item.inventory.age)}</strong></p><p>Unidades lançadas<strong>{formatNumber(item.inventory.units)}</strong></p><p>Estoque inicial<strong>{formatNumber(item.inventory.stock)}</strong></p></div>
    <p className="ev-note">{item.inventory.pattern} · {item.inventory.cadence}. Sem faixa calibrada para Curitiba.</p>
    {!METHODS.some(m => item.methods[m.id].forecast) && <p role="status" className="ev-science-disclaimer">Nenhum método selecionado produz previsão para este caso nesta data. O histórico permanece disponível; os motivos de cada método aparecem abaixo.</p>}
    <div className="ev-toolbar" role="group" aria-label="Unidade do gráfico"><Button variant={scale === 'stock' ? 'default' : 'outline'} onClick={() => setScale('stock')} aria-pressed={scale === 'stock'}>Estoque</Button><Button variant={scale === 'percent' ? 'default' : 'outline'} onClick={() => setScale('percent')} aria-pressed={scale === 'percent'}>Percentual vendido</Button>{trials.some(t => t.target === 'net' && t.actual !== null) && <Button variant={scale === 'net' ? 'default' : 'outline'} onClick={() => setScale('net')} aria-pressed={scale === 'net'}>Vendas desde a previsão</Button>}</div>
    <div className="ev-toolbar" role="group" aria-label="Métodos no gráfico">{METHODS.map(m => <Button key={m.id} variant={visible.includes(m.id) ? 'secondary' : 'ghost'} disabled={!item.methods[m.id].forecast} aria-pressed={visible.includes(m.id)} onClick={() => setVisible(v => v.includes(m.id) ? v.filter(id => id !== m.id) : [...v, m.id])}>{m.label}</Button>)}</div>
    <p className="ev-note">Linha escura: histórico usado. Linha posterior tracejada: resultado reportado, que não participou do cálculo. Lacunas interrompem as linhas.</p>
    <div className="ev-science-plot ev-science-detail-plot" role="img" aria-label="Histórico usado, previsões e resultado posterior; tabela logo abaixo"><ResponsiveContainer><LineChart data={rows} margin={{ top: 30, right: 20, left: 0, bottom: 12 }}><CartesianGrid strokeDasharray="3 5"/><XAxis dataKey="month" minTickGap={50} tick={{ fontSize: 11 }}/><YAxis width={48} domain={scale === 'percent' ? [0, 100] : ['auto', 'auto']} unit={scale === 'percent' ? '%' : undefined} tick={{ fontSize: 11 }}/><Tooltip contentStyle={{ background: 'hsl(var(--popover))', color: 'hsl(var(--popover-foreground))', fontSize: 12 }} formatter={formatNumber}/><Legend/><ReferenceLine x={item.cutoff} stroke="hsl(var(--foreground))" strokeDasharray="3 3" label={{ value: 'Previsão feita aqui', position: 'insideTopRight', fontSize: 11 }}/><Line dataKey="history" name="Histórico usado" stroke="hsl(var(--foreground))" strokeWidth={3} dot={{ r: 3 }} connectNulls={false} isAnimationActive={false}/><Line dataKey="actual" name="Posterior reportado" stroke="hsl(var(--foreground))" strokeWidth={2} strokeDasharray="2 4" dot={{ r: 2 }} connectNulls={false} isAnimationActive={false}/>{METHODS.filter(m => visible.includes(m.id)).map(m => <Line key={m.id} dataKey={m.id} name={m.label} stroke={methodColor(m.id)} strokeDasharray={m.id === 'finotti-reference' ? undefined : '7 4'} strokeWidth={m.id === 'finotti-reference' ? 3 : 2} dot={false} connectNulls={false} isAnimationActive={false}/>)}</LineChart></ResponsiveContainer></div>
    <section className="ev-science-method"><h3>O cálculo e suas condições</h3><Button variant="outline" onClick={() => setShowMath(!showMath)} aria-expanded={showMath}>Como foi calculado</Button>{METHODS.map(m => <article key={m.id}><h4>{m.label}</h4><p className="ev-note">{item.methods[m.id].forecast ? m.explanation : item.methods[m.id].reason}</p>{showMath && <><p className="ev-note">Versão: {item.methods[m.id].forecast?.version ?? m.version}</p>{Object.entries(item.methods[m.id].forecast?.parameters ?? {}).map(([k, v]) => <p className="ev-note" key={k}>{parameterLabels[k] ?? k}: {typeof v === 'number' ? v.toLocaleString('pt-BR', { maximumFractionDigits: k === 'k' ? 6 : 2 }) : v}</p>)}</>}</article>)}{showMath && <p className="ev-note">Aₙ: proporção vendida na data inicial. n: idade inicial em meses. t: idade prevista. k: forma da curva. A referência foi treinada até setembro de 2026. Para o vertical, a referência usa trajetórias de até 30 comparáveis. Não houve novo ajuste neste estudo.</p>}</section>
    <section><h3>Comparação por horizonte · {result.protocol.target === 'stock' ? 'estoque final' : 'vendas líquidas no intervalo'}</h3><div className="ev-table"><table><thead><tr><th>Método</th><th>Data</th><th>Previsto</th><th>Reportado</th><th>Erro</th><th>Condição</th></tr></thead><tbody>{trials.map(t => <tr key={`${t.method}|${t.horizon}`}><td>{METHODS.find(m => m.id === t.method)?.label}</td><td>{t.targetMonth}</td><td>{formatNumber(t.predicted)}</td><td>{formatNumber(t.actual)}</td><td>{formatNumber(t.error)}</td><td>{t.reason}</td></tr>)}</tbody></table></div></section>
    <div className="ev-table"><table><caption>Dados do gráfico · {scale === 'stock' ? 'estoque em unidades' : scale === 'net' ? 'vendas líquidas desde a data da previsão' : 'percentual vendido'}</caption><thead><tr><th>Mês</th><th>Histórico usado</th><th>Posterior reportado</th>{METHODS.filter(m => visible.includes(m.id)).map(m => <th key={m.id}>{m.label}</th>)}</tr></thead><tbody>{rows.map(r => <tr key={r.month}><td>{r.month}</td><td>{formatNumber(r.history as number | null)}</td><td>{formatNumber(r.actual as number | null)}</td>{METHODS.filter(m => visible.includes(m.id)).map(m => <td key={m.id}>{formatNumber(r[m.id] as number | null)}</td>)}</tr>)}</tbody></table></div>
    <ul className="ev-note list-disc pl-5">{item.inventory.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>
  </DialogContent></Dialog>;
}
