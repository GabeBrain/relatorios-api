import { useMemo } from 'react';
import type { QuantiRecord } from './types';
import { countBy } from './aggregate';
import { useQuantiStore } from './store';

/**
 * Grid-based Brazil map — each UF as a card positioned as in a stylized BR layout.
 * Click a UF to toggle the `estado` filter.
 */
const UF_GRID: Record<string, { row: number; col: number; name: string }> = {
  RR: { row: 0, col: 2, name: 'Roraima' },
  AP: { row: 0, col: 4, name: 'Amapá' },
  AM: { row: 1, col: 1, name: 'Amazonas' },
  PA: { row: 1, col: 3, name: 'Pará' },
  MA: { row: 1, col: 4, name: 'Maranhão' },
  CE: { row: 1, col: 5, name: 'Ceará' },
  RN: { row: 1, col: 6, name: 'Rio G. do Norte' },
  AC: { row: 2, col: 0, name: 'Acre' },
  RO: { row: 2, col: 1, name: 'Rondônia' },
  TO: { row: 2, col: 3, name: 'Tocantins' },
  PI: { row: 2, col: 4, name: 'Piauí' },
  PB: { row: 2, col: 6, name: 'Paraíba' },
  PE: { row: 3, col: 5, name: 'Pernambuco' },
  AL: { row: 3, col: 6, name: 'Alagoas' },
  MT: { row: 3, col: 2, name: 'Mato Grosso' },
  GO: { row: 3, col: 3, name: 'Goiás' },
  BA: { row: 3, col: 4, name: 'Bahia' },
  SE: { row: 4, col: 6, name: 'Sergipe' },
  DF: { row: 4, col: 3, name: 'Distrito Federal' },
  MS: { row: 4, col: 2, name: 'Mato G. do Sul' },
  MG: { row: 4, col: 4, name: 'Minas Gerais' },
  ES: { row: 4, col: 5, name: 'Espírito Santo' },
  SP: { row: 5, col: 3, name: 'São Paulo' },
  RJ: { row: 5, col: 4, name: 'Rio de Janeiro' },
  PR: { row: 6, col: 3, name: 'Paraná' },
  SC: { row: 7, col: 3, name: 'Santa Catarina' },
  RS: { row: 8, col: 3, name: 'Rio G. do Sul' },
};

// Common name normalization: dataset can have UF code or full name
const NAME_TO_UF: Record<string, string> = Object.fromEntries(
  Object.entries(UF_GRID).map(([uf, { name }]) => [name.toLowerCase(), uf]),
);
NAME_TO_UF['são paulo'] = 'SP';
NAME_TO_UF['rio grande do sul'] = 'RS';
NAME_TO_UF['rio grande do norte'] = 'RN';
NAME_TO_UF['mato grosso do sul'] = 'MS';

function toUF(v: string): string {
  const s = String(v).trim();
  if (UF_GRID[s.toUpperCase()]) return s.toUpperCase();
  return NAME_TO_UF[s.toLowerCase()] ?? s.toUpperCase();
}

export function BrazilMap({ rows }: { rows: QuantiRecord[] }) {
  const toggle = useQuantiStore((s) => s.toggleValue);
  const selected = useQuantiStore((s) => s.filters.estado ?? []);

  const { byUf, max, originalValueForUf } = useMemo(() => {
    const c = countBy(rows, 'estado');
    const byUf = new Map<string, number>();
    const originalValueForUf = new Map<string, string>();
    for (const { key, count } of c) {
      const uf = toUF(key);
      byUf.set(uf, (byUf.get(uf) ?? 0) + count);
      if (!originalValueForUf.has(uf)) originalValueForUf.set(uf, key);
    }
    return { byUf, max: Math.max(1, ...byUf.values()), originalValueForUf };
  }, [rows]);

  const rowsN = 9;
  const colsN = 7;
  const cells: (string | null)[][] = Array.from({ length: rowsN }, () => Array(colsN).fill(null));
  for (const [uf, { row, col }] of Object.entries(UF_GRID)) cells[row][col] = uf;

  return (
    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${colsN}, 1fr)` }}>
      {cells.flat().map((uf, idx) => {
        if (!uf) return <div key={idx} />;
        const n = byUf.get(uf) ?? 0;
        const alpha = 0.08 + (n / max) * 0.85;
        const originalVal = originalValueForUf.get(uf);
        const isSelected = originalVal ? selected.includes(originalVal) : false;
        return (
          <button
            key={idx}
            onClick={() => originalVal && toggle('estado', originalVal)}
            title={`${UF_GRID[uf].name}: ${n.toLocaleString('pt-BR')} entrevistas`}
            className="aspect-square rounded-md text-[10px] font-bold transition-transform hover:scale-105"
            style={{
              background: n > 0 ? `rgba(37, 99, 235, ${alpha})` : '#f1f5f9',
              color: n / max > 0.55 ? '#fff' : '#0f172a',
              outline: isSelected ? '2px solid #0f172a' : 'none',
              cursor: originalVal ? 'pointer' : 'default',
              opacity: originalVal ? 1 : 0.35,
            }}
          >
            <div>{uf}</div>
            <div className="text-[9px] font-normal opacity-90">{n > 0 ? n.toLocaleString('pt-BR') : ''}</div>
          </button>
        );
      })}
    </div>
  );
}
