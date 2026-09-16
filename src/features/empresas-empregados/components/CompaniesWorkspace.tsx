import { useMemo } from 'react';
import { Building2, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatInteger, formatPercentage } from '../domain';
import { SIMPLES_DISCLAIMER, buildCompaniesBreakdown, formatCompetencia, totalEstablishments } from '../companies-domain';
import type { CompaniesBreakdownItem, CompaniesReportMeta, CompaniesAggregatedRow, MunicipalityOption } from '../types';

function BreakdownCard({ title, rows, note }: { title: string; rows: CompaniesBreakdownItem[]; note?: string }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        {note && <p className="text-xs leading-5 text-muted-foreground">{note}</p>}
      </CardHeader>
      <CardContent className="pt-0">
        {rows.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Nenhum agregado retornado para este recorte.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Estabelecimentos</TableHead>
                <TableHead className="w-40 text-right">Participação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.code}>
                  <TableCell className="font-medium">{row.label}</TableCell>
                  <TableCell className="text-right">{formatInteger(row.quantidade)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Progress value={row.percentage} className="h-1.5 w-16" />
                      <span className="tabular-nums">{formatPercentage(row.percentage)}</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

interface Props {
  municipality: MunicipalityOption;
  meta: CompaniesReportMeta;
  rows: CompaniesAggregatedRow[];
}

export default function CompaniesWorkspace({ municipality, meta, rows }: Props) {
  const total = useMemo(() => totalEstablishments(rows), [rows]);
  const breakdown = useMemo(() => buildCompaniesBreakdown(rows), [rows]);

  return (
    <section className="space-y-5 animate-fade-in" aria-label="Relatório de empresas">
      <div className="flex flex-col gap-3 rounded-xl border border-primary/15 bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 font-semibold">
            <Building2 className="h-4 w-4 text-primary" />
            {municipality.name}/{municipality.uf} · competência {formatCompetencia(meta.competencia)}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">{meta.source} · {meta.methodologyVersion}</p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Estabelecimentos ativos</p>
          <p className="text-2xl font-semibold tracking-tight">{formatInteger(total)}</p>
        </div>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>{SIMPLES_DISCLAIMER}</AlertDescription>
      </Alert>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <BreakdownCard title="Seção CNAE" rows={breakdown.cnaeSections} />
        </div>
        <div className="space-y-4">
          <BreakdownCard title="Porte" rows={breakdown.porte} note="Códigos de porte da Receita Federal." />
          <BreakdownCard title="Matriz e filial" rows={breakdown.matrizFilial} />
          <BreakdownCard title="Regime Simples/MEI" rows={breakdown.regimeSimples} note={SIMPLES_DISCLAIMER} />
        </div>
      </div>
    </section>
  );
}
