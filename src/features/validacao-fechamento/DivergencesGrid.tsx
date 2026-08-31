import { useMemo, useState } from 'react';
import type { Divergence } from './validation-rules';

export function DivergencesGrid({ rows }: { rows: Divergence[] }) {
  const [error, setError] = useState(''); const [rule, setRule] = useState('');
  const errors = useMemo(() => [...new Set(rows.map((r) => r.error))].sort(), [rows]);
  const rules = useMemo(() => [...new Set(rows.map((r) => r.rule))].sort(), [rows]);
  const filtered = rows.filter((r) => (!error || r.error === error) && (!rule || r.rule === rule));
  return <div className="space-y-2"><div className="vf-card flex flex-wrap items-end gap-3 p-3"><label className="text-[10pt]">Erro<select className="vf-select ml-2 h-8 min-w-64" value={error} onChange={(e) => setError(e.target.value)}><option value="">Todos</option>{errors.map((v) => <option key={v}>{v}</option>)}</select></label><label className="text-[10pt]">Regra<select className="vf-select ml-2 h-8 min-w-56" value={rule} onChange={(e) => setRule(e.target.value)}><option value="">Todas</option>{rules.map((v) => <option key={v}>{v}</option>)}</select></label><span className="ml-auto text-[10pt] text-[var(--vf-muted)]">{filtered.length.toLocaleString('pt-BR')} divergências</span></div><div className="vf-grid-wrap overflow-auto"><table className="vf-grid min-w-[1250px]"><thead><tr>{['ID Empreendimento','Empreendimento','ID Tipologia','Área Privativa','Campo','Erro','Valor','Regra'].map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>{filtered.map((r, i) => <tr key={`${r.building_id}-${r.typology_id}-${r.field}-${r.error}-${i}`}><td>{r.building_id}</td><td>{r.building_name}</td><td>{r.typology_id}</td><td>{r.private_area == null ? '—' : r.private_area.toLocaleString('pt-BR')}</td><td>{r.field}</td><td>{r.error}</td><td>{r.value}</td><td>{r.rule}</td></tr>)}</tbody></table>{filtered.length === 0 && <div className="p-6 text-center text-sm text-[var(--vf-muted)]">Nenhuma divergência para os filtros selecionados.</div>}</div></div>;
}
