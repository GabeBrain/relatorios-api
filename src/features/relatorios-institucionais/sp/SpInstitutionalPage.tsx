import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { GeoApiScopeSelector, useGeoApiScope, type GeoScope } from '@/features/shared/geo-api-scope-engine';
import { availableEndQuarters } from '@/features/panorama-secovi-fiergs/domain/quarters';
import type { Quarter } from '@/features/panorama-secovi-fiergs/types';
import { useAuthStore } from '@/store/auth-store';
import { buildSpPreview, SP_INSTITUTIONAL, type SpPreview } from './model';

const labels = { projects: 'Empreendimentos lançados', launches: 'Unidades lançadas', sales: 'Vendas líquidas', stock: 'Oferta final' } as const;
const formatMonth = (value: string) => new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}-01T12:00:00Z`));
const sameCity = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() === 'sao paulo';

export default function SpInstitutionalPage() {
  const [geo, setGeo] = useState<GeoScope>({ uf: '', city: '' });
  const [quarter, setQuarter] = useState<Quarter>('3T2026');
  const [preview, setPreview] = useState<{ key: string; report: SpPreview } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const version = useRef(0);
  const token = useAuthStore(state => state.getToken());
  const invalidate = useCallback(() => { version.current += 1; setPreview(null); setLoading(false); setError(false); }, []);
  useEffect(() => { invalidate(); return () => { version.current += 1; }; }, [token, invalidate]);
  const changeGeo = (next: GeoScope) => { invalidate(); setGeo(next); };
  const scope = useGeoApiScope({ value: geo, onChange: changeGeo });
  const supported = geo.uf === 'SP' && sameCity(geo.city);
  const ready = scope.strictReady && scope.hasToken && !scope.isLoading && !scope.error && supported;
  const key = `${geo.uf}/${geo.city}/${quarter}`;
  const report = ready && preview?.key === key ? preview.report : null;

  async function preparePreview() {
    if (!ready || loading) return;
    const requestVersion = ++version.current;
    setLoading(true); setError(false); setPreview(null);
    try {
      const { spFixture } = await import('./fixture');
      const next = buildSpPreview(spFixture(), quarter);
      if (requestVersion === version.current) setPreview({ key, report: next });
    } catch {
      if (requestVersion === version.current) setError(true);
    } finally {
      if (requestVersion === version.current) setLoading(false);
    }
  }

  return <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
    <header className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Relatórios institucionais</p>
      <h1 className="text-2xl font-semibold">{SP_INSTITUTIONAL.label}</h1>
      <p className="text-sm text-muted-foreground">Núcleo residencial vertical de São Paulo capital.</p>
    </header>
    <Alert><AlertTitle>Prévia de desenvolvimento · dados fictícios</AlertTitle><AlertDescription>
      Esta etapa permite avaliar a estrutura e as regras de fechamento. Os números do exemplo não representam o mercado e não há exportação disponível.
    </AlertDescription></Alert>
    <section aria-label="Seleção do estudo" className="space-y-4 rounded-lg border border-border bg-card p-4">
      {scope.error ? <Alert variant="destructive"><AlertTitle>Não foi possível carregar as cidades autorizadas</AlertTitle><AlertDescription><p>Confira sua autenticação e tente novamente. O estudo permanece bloqueado.</p><Button className="mt-3" variant="outline" onClick={scope.reload}>Tentar carregar cidades novamente</Button></AlertDescription></Alert>
        : <GeoApiScopeSelector value={geo} onChange={changeGeo} disabled={loading} />}
      {scope.isLoading && <p role="status" className="text-sm text-muted-foreground">Carregando municípios autorizados…</p>}
      {geo.city && !supported && <p className="text-sm text-muted-foreground">O primeiro piloto contempla somente São Paulo capital. Selecione SP e São Paulo.</p>}
      <div className="flex flex-wrap items-end gap-4">
        <div className="w-48 space-y-1.5"><label htmlFor="sp-quarter" className="text-sm font-medium">Trimestre do estudo</label>
          <Select value={quarter} onValueChange={value => { invalidate(); setQuarter(value as Quarter); }} disabled={loading}>
            <SelectTrigger id="sp-quarter"><SelectValue /></SelectTrigger>
            <SelectContent>{availableEndQuarters('1T2026').reverse().map(value => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <Button onClick={preparePreview} disabled={!ready || loading}>{loading ? 'Preparando prévia…' : 'Ver prévia com dados de teste'}</Button>
      </div>
      {!scope.error && !scope.isLoading && !ready && <p className="text-sm text-muted-foreground">Faça login e selecione um município autorizado para continuar.</p>}
      <p className="text-xs text-muted-foreground">Somente o catálogo de cidades usa sua autenticação. Esta prévia não consulta históricos de mercado.</p>
    </section>
    {loading && <div role="status" className="space-y-3" aria-busy="true"><p>Preparando o exemplo do estudo…</p><div className="h-32 animate-pulse rounded-lg bg-muted" /></div>}
    {error && <Alert variant="destructive"><AlertTitle>Não foi possível preparar a prévia</AlertTitle><AlertDescription><p>Tente novamente mantendo o recorte selecionado.</p><Button className="mt-3" variant="outline" onClick={preparePreview} disabled={!ready || loading}>Tentar novamente</Button></AlertDescription></Alert>}
    {!report && !loading && !error && <p className="text-sm text-muted-foreground">Nenhuma prévia preparada. Selecione o recorte e o trimestre para visualizar o exemplo.</p>}
    {report && <section aria-label="Prévia do estudo" className="space-y-4 rounded-lg border border-border bg-card p-4">
      <div><h2 className="text-lg font-semibold">São Paulo / SP · {report.quarter}</h2><p className="text-sm text-muted-foreground">Dados fictícios · fechamento do exemplo: {report.closingMonth ? formatMonth(report.closingMonth) : 'não informado'}.</p></div>
      {report.status === 'ready' ? <Alert><AlertTitle>Prévia reconciliada com dados de teste</AlertTitle><AlertDescription>As verificações do exemplo fecharam. Isso não comprova dados reais, publicação ou homologação do relatório.</AlertDescription></Alert>
        : <Alert variant={report.status === 'awaiting-closure' ? 'default' : 'destructive'}><AlertTitle>{report.status === 'awaiting-closure' ? 'Trimestre ainda não fechado' : 'Dados insuficientes para concluir o estudo'}</AlertTitle><AlertDescription>{report.issues.map(issue => <p key={issue}>{issue}</p>)}<p className="mt-2">Os indicadores permanecem indisponíveis; meses ausentes não são preenchidos com zero.</p></AlertDescription></Alert>}
      <Table><TableCaption>Contagens do trimestre selecionado; oferta final no fechamento. Todos os valores desta prévia são fictícios.</TableCaption><TableHeader><TableRow><TableHead>Indicador</TableHead><TableHead className="text-right">Quantidade</TableHead></TableRow></TableHeader><TableBody>
        {Object.entries(labels).map(([metric, label]) => <TableRow key={metric}><TableCell>{label}</TableCell><TableCell className="text-right tabular-nums">{report.metrics[metric as keyof typeof labels]?.toLocaleString('pt-BR') ?? 'Indisponível'}</TableCell></TableRow>)}
      </TableBody></Table>
      {report.checks.length > 0 && <details><summary className="cursor-pointer text-sm font-medium">Conferência dos números do exemplo</summary><ul className="mt-2 space-y-1 text-sm text-muted-foreground">{report.checks.map(check => <li key={check.label}>{check.label}: diferença de {check.delta.toLocaleString('pt-BR')} unidades.</li>)}</ul></details>}
    </section>}
  </div>;
}
