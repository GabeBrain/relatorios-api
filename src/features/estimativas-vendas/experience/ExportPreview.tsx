import { useRef, useState, type DragEvent } from 'react';
import { ArrowLeft, ArrowRight, EyeOff, GripVertical, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { FORECAST_COLUMNS, forecastTable, moveForecastColumn, type ForecastColumn } from './exportColumns';

export function ExportPreview({ rows, columns, onChange, disabled }: { rows: Record<string, unknown>[]; columns: ForecastColumn[]; onChange: (columns: ForecastColumn[]) => void; disabled: boolean }) {
  const [dragging, setDragging] = useState<ForecastColumn | null>(null), [target, setTarget] = useState<ForecastColumn | null>(null), [announcement, setAnnouncement] = useState('');
  const scroller = useRef<HTMLDivElement>(null);
  const hidden = FORECAST_COLUMNS.filter(c => !columns.includes(c));
  const table = forecastTable(rows.slice(0, 50), columns);
  function move(source: ForecastColumn, destination: ForecastColumn) { onChange(moveForecastColumn(columns, source, destination)); setAnnouncement(`${source} movida para a posição ${columns.indexOf(destination) + 1}.`); }
  function hide(column: ForecastColumn) { if (columns.length <= 1) return; onChange(columns.filter(c => c !== column)); setAnnouncement(`${column} ocultada no arquivo.`); }
  function scrollOnDrag(e: DragEvent) {
    if (!dragging || !scroller.current) return;
    const rect = scroller.current.getBoundingClientRect();
    if (e.clientX > rect.right - 70) scroller.current.scrollBy({ left: 24 });
    else if (e.clientX < rect.left + 70) scroller.current.scrollBy({ left: -24 });
  }
  return <section className="eve-preview" aria-label="Prévia do Excel">
    <div className="eve-preview-heading"><span>Prévia · {Math.min(rows.length, 50)} de {rows.length} linhas · {columns.length} colunas</span><Button variant="ghost" disabled={disabled} onClick={() => { onChange([...FORECAST_COLUMNS]); setAnnouncement('Colunas originais restauradas.'); }}>Restaurar colunas</Button></div>
    {hidden.length > 0 && <div className="eve-hidden"><span>Ocultas:</span>{hidden.map(c => <Button key={c} variant="ghost" disabled={disabled} aria-label={`Mostrar coluna ${c}`} onClick={() => { onChange([...columns, c]); setAnnouncement(`${c} restaurada ao final.`); }}>{c} +</Button>)}</div>}
    <p className="sr-only" aria-live="polite">{announcement}</p>
    <div className="eve-table-scroll" ref={scroller} tabIndex={0} role="region" aria-label="Tabela de previsões exportáveis" onDragOver={scrollOnDrag}>
      <table><caption className="sr-only">Primeiras 50 linhas. O arquivo completo usa a mesma ordem e as mesmas colunas visíveis. Arraste pelo ícone ou use Alt e as setas para mover uma coluna.</caption><thead><tr><th className="eve-index" scope="col">#</th>{columns.map((column, index) => <th key={column} scope="col" data-column={column} className={target === column && dragging !== column ? 'eve-drop-target' : ''} onDragOver={e => { if (dragging && !disabled) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setTarget(column); } }} onDrop={e => { e.preventDefault(); if (dragging && !disabled) move(dragging, column); setDragging(null); setTarget(null); }}>
        <div className="eve-column-head"><button type="button" className="eve-drag" draggable={!disabled} disabled={disabled} aria-label={`Mover coluna ${column}`} title="Arrastar coluna · Alt + ← ou →" onDragStart={e => { setDragging(column); e.dataTransfer.setData('text/plain', column); e.dataTransfer.effectAllowed = 'move'; }} onDragEnd={() => { setDragging(null); setTarget(null); }} onKeyDown={e => { if (disabled || !e.altKey || !['ArrowLeft', 'ArrowRight'].includes(e.key)) return; e.preventDefault(); const destination = columns[index + (e.key === 'ArrowLeft' ? -1 : 1)]; if (destination) move(column, destination); }}><GripVertical size={14} /></button><span>{column}</span>
          <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" className="eve-column-menu" disabled={disabled} aria-label={`Opções da coluna ${column}`}><MoreHorizontal size={15} /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem disabled={disabled || index === 0} onSelect={() => move(column, columns[index - 1])}><ArrowLeft size={14} /> Mover para a esquerda</DropdownMenuItem><DropdownMenuItem disabled={disabled || index === columns.length - 1} onSelect={() => move(column, columns[index + 1])}><ArrowRight size={14} /> Mover para a direita</DropdownMenuItem><DropdownMenuItem disabled={disabled || columns.length <= 1} onSelect={() => hide(column)}><EyeOff size={14} /> Ocultar coluna</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
        </div>
      </th>)}</tr></thead><tbody>{table.slice(1).map((row, index) => <tr key={index}><th className="eve-index" scope="row">{index + 1}</th>{row.map((value, i) => <td key={columns[i]} data-column={columns[i]} title={value === null ? '' : String(value)}>{value === null ? '' : String(value)}</td>)}</tr>)}</tbody></table>
    </div>
    {!rows.length && <p role="status">Sem linhas de previsão neste conjunto.</p>}
  </section>;
}
