import { useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  ColumnDef, ColumnFiltersState, SortingState, VisibilityState,
  flexRender, getCoreRowModel, getFilteredRowModel, getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, Copy, Download, Search } from 'lucide-react';
import type { ClosureRow } from './aggregate';

interface Props { rows: ClosureRow[]; }

const columns: ColumnDef<ClosureRow>[] = [
  { accessorKey: 'building_name', header: 'Empreendimento' },
  { accessorKey: 'building_type', header: 'Tipo' },
  { accessorKey: 'standard', header: 'Padrão' },
  { accessorKey: 'city', header: 'Cidade' },
  { accessorKey: 'type_of_typology', header: 'Tipologia' },
  { accessorKey: 'number_bedroom', header: 'Dorm.' },
  { accessorKey: 'garage', header: 'Vagas' },
  { accessorKey: 'qty', header: 'Qtd unid.' },
  { accessorKey: 'private_area', header: 'Área priv. (m²)' },
  { accessorKey: 'period', header: 'Período' },
  { accessorKey: 'bucketYear', header: 'Ano' },
  { accessorKey: 'bucketQuarter', header: 'Trim.' },
  { accessorKey: 'bucketMonth', header: 'Mês' },
  { accessorKey: 'price', header: 'Preço',
    cell: (c) => {
      const v = c.getValue<number | null>();
      return v == null ? '—' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
    },
  },
  { accessorKey: 'typology_stock', header: 'Estoque' },
  { accessorKey: 'sold_in_period', header: 'Vend./período' },
  { accessorKey: 'vgv_period', header: 'VGV período',
    cell: (c) => c.getValue<number>().toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }),
  },
];

export function DetalhamentoGrid({ rows }: Props) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = useState('');

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, columnFilters, columnVisibility, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    columnResizeMode: 'onChange',
  });

  const modelRows = table.getRowModel().rows;
  const parentRef = useRef<HTMLDivElement>(null);
  const virt = useVirtualizer({
    count: modelRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 30,
    overscan: 12,
  });

  const [showCols, setShowCols] = useState(false);

  function exportRows(fmt: 'xlsx' | 'csv') {
    const data = modelRows.map((r) => r.original);
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Detalhamento');
    if (fmt === 'xlsx') XLSX.writeFile(wb, 'validacao-fechamento.xlsx');
    else XLSX.writeFile(wb, 'validacao-fechamento.csv', { bookType: 'csv' });
  }

  async function copyVisible() {
    const cols = table.getVisibleLeafColumns();
    const header = cols.map((c) => String(c.columnDef.header ?? c.id)).join('\t');
    const lines = modelRows.map((r) =>
      cols.map((c) => String(r.getValue(c.id) ?? '')).join('\t'),
    );
    await navigator.clipboard.writeText([header, ...lines].join('\n'));
  }

  const totalWidth = useMemo(() => table.getVisibleLeafColumns().reduce((s, c) => s + c.getSize(), 0), [table, columnVisibility]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[var(--vf-muted)]" />
          <input
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Pesquisar em qualquer coluna…"
            className="w-full rounded border border-[var(--vf-border)] bg-[var(--vf-card)] px-7 py-1.5 text-[10pt] outline-none focus:border-[var(--vf-primary)]"
          />
        </div>
        <div className="relative">
          <button type="button" className="vf-btn" onClick={() => setShowCols((v) => !v)}>Colunas</button>
          {showCols && (
            <div className="absolute right-0 z-20 mt-1 w-56 rounded border border-[var(--vf-border)] bg-[var(--vf-card)] p-2 shadow-lg">
              {table.getAllLeafColumns().map((c) => (
                <label key={c.id} className="flex cursor-pointer items-center gap-2 py-1 text-[10pt]">
                  <input type="checkbox" checked={c.getIsVisible()} onChange={c.getToggleVisibilityHandler()} />
                  {String(c.columnDef.header ?? c.id)}
                </label>
              ))}
            </div>
          )}
        </div>
        <button type="button" className="vf-btn" onClick={copyVisible}><Copy className="mr-1 inline h-3 w-3" />Copiar</button>
        <button type="button" className="vf-btn" onClick={() => exportRows('csv')}><Download className="mr-1 inline h-3 w-3" />CSV</button>
        <button type="button" className="vf-btn" data-variant="primary" onClick={() => exportRows('xlsx')}>
          <Download className="mr-1 inline h-3 w-3" />Excel
        </button>
        <div className="ml-auto text-[10pt] text-[var(--vf-muted)]">{modelRows.length.toLocaleString('pt-BR')} registros</div>
      </div>

      <div className="vf-grid-wrap">
        <div ref={parentRef} className="overflow-auto" style={{ maxHeight: 640 }}>
          <table className="vf-grid" style={{ width: totalWidth, minWidth: '100%' }}>
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((h) => {
                    const sorted = h.column.getIsSorted();
                    return (
                      <th
                        key={h.id}
                        style={{ width: h.getSize(), position: 'sticky', top: 0 }}
                      >
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            className="flex-1 text-left"
                            onClick={h.column.getToggleSortingHandler()}
                          >
                            {flexRender(h.column.columnDef.header, h.getContext())}
                            {sorted === 'asc' && <ArrowUp className="ml-1 inline h-3 w-3" />}
                            {sorted === 'desc' && <ArrowDown className="ml-1 inline h-3 w-3" />}
                          </button>
                          <div
                            onMouseDown={h.getResizeHandler()}
                            onTouchStart={h.getResizeHandler()}
                            className="vf-resizer"
                          />
                        </div>
                        <input
                          className="vf-col-filter mt-1"
                          value={(h.column.getFilterValue() as string) ?? ''}
                          onChange={(e) => h.column.setFilterValue(e.target.value)}
                          placeholder="Filtro…"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody style={{ display: 'block', height: virt.getTotalSize(), position: 'relative' }}>
              {virt.getVirtualItems().map((v) => {
                const r = modelRows[v.index];
                return (
                  <tr
                    key={r.id}
                    style={{
                      position: 'absolute',
                      top: 0,
                      transform: `translateY(${v.start}px)`,
                      display: 'table',
                      tableLayout: 'fixed',
                      width: totalWidth,
                    }}
                  >
                    {r.getVisibleCells().map((c) => (
                      <td key={c.id} style={{ width: c.column.getSize() }}>
                        {flexRender(c.column.columnDef.cell, c.getContext())}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
