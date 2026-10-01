import { useCallback, useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { ArrowDown, ArrowUp, Check, Copy, Download, Eye, EyeOff, Info, Search } from 'lucide-react';
import { flexRender, getCoreRowModel, getFilteredRowModel, getSortedRowModel, useReactTable, type ColumnDef, type ColumnFiltersState, type SortingState, type VisibilityState } from '@tanstack/react-table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useAuthStore } from '@/store/auth-store';
import { approvalKey, approveDivergence, listApprovals, type DivergenceApproval } from './approvals';
import type { Divergence } from './validation-rules';

const fieldLabel: Record<string, string> = { builder_name: 'Incorporadora', total_stock: 'Estoque total', standard: 'Padrão', price_private_area: 'Preço por m²', qty: 'Quantidade de unidades', down_payment_percentage: 'Percentual de entrada', number_of_installments: 'Número de parcelas', bank_financing: 'Financiamento bancário', interest_rate_tax: 'Taxa de juros', total_units: 'Total de unidades', sold: 'Unidades vendidas', release_price: 'Preço de lançamento', sold_in_period: 'Vendas no período', release_date: 'Data de lançamento', distractions: 'Distratos', private_area: 'Área privativa', price: 'Preço', number_bedroom: 'Número de dormitórios', garage: 'Vagas de garagem' };

function approvalDate(value: string | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('pt-BR');
}

export function DivergencesGrid({ rows, onDivergenceCountChange }: { rows: Divergence[]; onDivergenceCountChange?: (count: number) => void }) {
  const token = useAuthStore((state) => state.getToken());
  const email = useAuthStore((state) => state.email);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({ city: false, field: false, rule: false, group: false });
  const [globalFilter, setGlobalFilter] = useState('');
  const [showColumns, setShowColumns] = useState(false);
  const [showApproved, setShowApproved] = useState(false);
  const [approvals, setApprovals] = useState<Record<string, DivergenceApproval>>({});
  const [approvalError, setApprovalError] = useState('');
  const [approvingKey, setApprovingKey] = useState('');
  const [pendingApproval, setPendingApproval] = useState<Divergence | null>(null);
  const cities = useMemo(() => Array.from(new Set(rows.map((row) => row.city))).sort((a, b) => a.localeCompare(b)), [rows]);
  const citiesKey = cities.join('\u0000');

  useEffect(() => {
    let cancelled = false;
    if (!token || cities.length === 0) {
      setApprovals({});
      return () => { cancelled = true; };
    }
    setApprovalError('');
    void listApprovals(token, cities)
      .then((items) => { if (!cancelled) setApprovals(Object.fromEntries(items.map((item) => [item.approval_key, item]))); })
      .catch((error: Error) => { if (!cancelled) setApprovalError(error.message || 'Não foi possível carregar as aprovações.'); });
    return () => { cancelled = true; };
  }, [token, cities, citiesKey]);

  const approve = useCallback(async (row: Divergence) => {
    const key = approvalKey(row);
    if (!token) { setApprovalError('Faça login para aprovar uma divergência.'); return; }
    if (!email) { setApprovalError('O e-mail da autenticação não está disponível. Refaça o login.'); return; }
    setApprovingKey(key);
    setApprovalError('');
    try {
      const approval = await approveDivergence(token, email, row);
      setApprovals((current) => ({ ...current, [approval.approval_key]: approval }));
    } catch (error) {
      setApprovalError((error as Error).message || 'Não foi possível aprovar a divergência.');
    } finally {
      setApprovingKey('');
    }
  }, [email, token]);

  const unapprovedRows = useMemo(() => rows.filter((row) => !approvals[approvalKey(row)]), [approvals, rows]);
  const visibleRows = showApproved ? rows : unapprovedRows;
  useEffect(() => { onDivergenceCountChange?.(unapprovedRows.length); }, [onDivergenceCountChange, unapprovedRows.length]);
  const columns = useMemo<ColumnDef<Divergence>[]>(() => [
    { accessorKey: 'building_name', header: 'Empreendimento', size: 210 },
    { accessorKey: 'private_area', header: 'Área Privativa', size: 110 },
    { accessorKey: 'city', header: 'Cidade', size: 140 },
    { accessorKey: 'status', header: 'Status', size: 100 },
    { accessorKey: 'period', header: 'Período', size: 105 },
    { accessorKey: 'field', header: 'Campo', size: 155, cell: (cell) => fieldLabel[cell.getValue<string>()] ?? cell.getValue<string>() },
    { accessorKey: 'error', header: 'Divergência', size: 320 },
    { accessorKey: 'value', header: 'Valor', size: 360 },
    { accessorKey: 'rule', header: 'Regra', size: 230 },
    { accessorKey: 'group', header: 'Grupo', size: 360 },
    { id: 'approval_action', header: 'Ação', size: 110, enableHiding: false, enableSorting: false, cell: (cell) => {
      const key = approvalKey(cell.row.original);
      const approval = approvals[key];
      if (approval) return <span className="whitespace-nowrap text-[9pt] text-[var(--vf-muted)]" title={`${approval.approved_by_email} · ${approvalDate(approval.approved_at)}`}><Check className="mr-1 inline h-3 w-3 text-[var(--vf-primary)]" />Aprovada</span>;
      return <button type="button" className="vf-btn whitespace-nowrap" disabled={Boolean(approvingKey)} onClick={() => setPendingApproval(cell.row.original)}><Check className="mr-1 inline h-3 w-3" />{approvingKey === key ? 'Aprovando…' : 'Aprovar'}</button>;
    } },
  ], [approvals, approve, approvingKey]);

  const table = useReactTable({ data: visibleRows, columns, state: { sorting, columnFilters, columnVisibility, globalFilter }, onSortingChange: setSorting, onColumnFiltersChange: setColumnFilters, onColumnVisibilityChange: setColumnVisibility, onGlobalFilterChange: setGlobalFilter, getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel(), getFilteredRowModel: getFilteredRowModel(), columnResizeMode: 'onChange' });
  const modelRows = table.getRowModel().rows;
  const visibleColumnSize = table.getVisibleLeafColumns().reduce((sum, column) => sum + column.getSize(), 0);
  const widthOf = (size: number) => `${(size / visibleColumnSize) * 100}%`;

  function download() {
    const data = rows.map((row) => {
      const approval = approvals[approvalKey(row)];
      return { 'ID Empreendimento': row.building_id, 'ID Tipologia': row.isBuildingRule ? 0 : row.typology_id, Empreendimento: row.building_name, 'Área Privativa': row.isBuildingRule ? 'Empreendimento' : row.private_area, Cidade: row.city, Status: row.status, Período: row.period, Campo: fieldLabel[row.field] ?? row.field, Divergência: row.error, Valor: row.value, Regra: row.rule, Grupo: row.group, 'Aprovado por': approval?.approved_by_email ?? '', 'Aprovado em': approvalDate(approval?.approved_at) };
    });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data), 'Divergências');
    XLSX.writeFile(workbook, 'divergencias-encontradas.xlsx');
  }

  async function copyVisible() {
    const copyColumns = table.getVisibleLeafColumns().filter((column) => column.id !== 'approval_action');
    const text = [copyColumns.map((column) => String(column.columnDef.header ?? column.id)).join('\t'), ...modelRows.map((row) => copyColumns.map((column) => String(row.getValue(column.id) ?? '')).join('\t'))].join('\n');
    await navigator.clipboard.writeText(text);
  }

  return <div className="space-y-2">
    <div className="vf-card flex flex-wrap items-center gap-2 p-3">
      <div className="relative min-w-[220px] flex-1"><Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[var(--vf-muted)]" /><input value={globalFilter} onChange={(event) => setGlobalFilter(event.target.value)} placeholder="Pesquisar em qualquer coluna…" className="w-full rounded border border-[var(--vf-border)] bg-[var(--vf-card)] px-7 py-1.5 text-[10pt] outline-none focus:border-[var(--vf-primary)]" /></div>
      <button type="button" className="vf-btn" onClick={() => setShowColumns((value) => !value)}>Colunas</button>
      {showColumns && <div className="vf-div-columns">{table.getAllLeafColumns().filter((column) => column.id !== 'approval_action').map((column) => <label key={column.id}><input type="checkbox" checked={column.getIsVisible()} onChange={column.getToggleVisibilityHandler()} /> {typeof column.columnDef.header === 'string' ? column.columnDef.header : column.id}</label>)}</div>}
      <button type="button" className="vf-btn" onClick={() => setShowApproved((value) => !value)}>{showApproved ? <EyeOff className="mr-1 inline h-3 w-3" /> : <Eye className="mr-1 inline h-3 w-3" />}{showApproved ? 'Ocultar aprovadas' : `Exibir aprovadas (${Object.keys(approvals).length})`}</button>
      <button type="button" className="vf-btn" onClick={() => void copyVisible()}><Copy className="mr-1 inline h-3 w-3" />Copiar</button>
      <button type="button" className="vf-btn" onClick={download}><Download className="mr-1 inline h-3 w-3" />Excel</button>
      <span className="ml-auto whitespace-nowrap text-[10pt] text-[var(--vf-muted)]">{modelRows.length.toLocaleString('pt-BR')} divergências exibidas</span>
    </div>
    {approvalError && <div className="rounded border border-red-300 bg-red-50 p-2 text-[10pt] text-red-700">{approvalError}</div>}
    <AlertDialog open={Boolean(pendingApproval)} onOpenChange={(open) => { if (!open) setPendingApproval(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Aprovar esta divergência?</AlertDialogTitle>
          <AlertDialogDescription>
            {pendingApproval ? <>A divergência de <strong>{pendingApproval.building_name}</strong> será marcada como aprovada e ficará oculta nas próximas consultas. Esta ação não poderá ser desfeita.</> : ''}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={() => { if (pendingApproval) { void approve(pendingApproval); setPendingApproval(null); } }}>Confirmar aprovação</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    <div className="vf-grid-wrap"><div className="overflow-y-auto overflow-x-hidden" style={{ maxHeight: 640 }}><table className="vf-grid vf-divergences" style={{ width: '100%', minWidth: 0 }}><thead>{table.getHeaderGroups().map((headerGroup) => <tr key={headerGroup.id}>{headerGroup.headers.map((header) => { const sorted = header.column.getIsSorted(); return <th key={header.id} style={{ width: widthOf(header.getSize()), position: 'sticky', top: 0 }}><div className="flex items-center gap-1"><button type="button" className="flex-1 text-left" onClick={header.column.getToggleSortingHandler()}>{flexRender(header.column.columnDef.header, header.getContext())}{sorted === 'asc' && <ArrowUp className="ml-1 inline h-3 w-3" />}{sorted === 'desc' && <ArrowDown className="ml-1 inline h-3 w-3" />}</button>{header.column.id === 'value' && <Popover><PopoverTrigger asChild><button type="button" className="vf-info" aria-label="Regras de agrupamentos"><Info className="h-3.5 w-3.5" /></button></PopoverTrigger><PopoverContent align="start" className="w-96 text-[10pt] leading-relaxed"><strong>Regras de agrupamentos</strong><p className="mt-1 text-muted-foreground">Regras de empreendimento usam <code>building_id + período</code>, somando as tipologias da fotografia. Regras de cidade usam <code>cidade + tipo do empreendimento + tipo de tipologia + padrão + dormitórios + período</code>. A validação considera a última fotografia disponível de cada empreendimento ou tipologia.</p></PopoverContent></Popover>}<div onMouseDown={header.getResizeHandler()} onTouchStart={header.getResizeHandler()} className="vf-resizer" /></div>{header.column.id !== 'approval_action' && <input className="vf-col-filter mt-1" value={(header.column.getFilterValue() as string) ?? ''} onChange={(event) => header.column.setFilterValue(event.target.value)} placeholder="Filtro…" onClick={(event) => event.stopPropagation()} />}</th>; })}</tr>)}</thead><tbody>{modelRows.map((row) => { const approved = Boolean(approvals[approvalKey(row.original)]); return <tr key={row.id} className={approved ? 'vf-div-approved' : undefined}>{row.getVisibleCells().map((cell) => <td key={cell.id} style={{ width: widthOf(cell.column.getSize()) }}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}</tr>; })}</tbody></table>{modelRows.length === 0 && <div className="p-6 text-center text-sm text-[var(--vf-muted)]">Nenhuma divergência para os filtros selecionados.</div>}</div></div>
  </div>;
}
