import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { FortalezaMarketReport, MarketLine } from './market';

const number = (value: number) => value.toLocaleString('pt-BR');
function BalanceTable({ lines, label, groups = false }: { lines: MarketLine[]; label: string; groups?: boolean }) {
  return <div className="min-w-0 overflow-x-auto rounded-lg border"><Table aria-label={label}>
    <TableHeader><TableRow><TableHead>Município</TableHead><TableHead>Mês</TableHead>{groups && <TableHead>Padrão informado</TableHead>}<TableHead className="text-right">Oferta anterior</TableHead><TableHead className="text-right">Lançamentos</TableHead><TableHead className="text-right">Vendas líquidas</TableHead><TableHead className="text-right">Oferta final</TableHead><TableHead className="text-right">Diferença do balanço</TableHead></TableRow></TableHeader>
    <TableBody>{lines.map(line => <TableRow key={`${line.city}/${line.month}/${line.group}`}><TableCell className="whitespace-nowrap">{line.city}</TableCell><TableCell className="whitespace-nowrap">{line.month}</TableCell>{groups && <TableCell className="whitespace-nowrap">{line.group}</TableCell>}{(['openingStock', 'launches', 'sales', 'closingStock', 'delta'] as const).map(field => <TableCell key={field} className="text-right tabular-nums">{number(line[field])}</TableCell>)}</TableRow>)}</TableBody>
  </Table></div>;
}
export function FortalezaMarketPanel({ report }: { report: FortalezaMarketReport }) {
  const lines = report.cities.flatMap(city => city.lines);
  return <section aria-label="Dados verticais consultados" className="min-w-0 space-y-5">
    <header><h2 className="text-xl font-semibold">Residencial vertical · {report.period.label}</h2><p className="mt-1 text-sm text-muted-foreground">{report.cities.map(city => city.city).join(', ')} / CE · fonte: API GeoBrain</p><p className="mt-1 text-xs text-muted-foreground">Janela {report.period.start} a {report.period.end} · estoque de abertura em {report.period.opening}. Não inclui casas, loteamentos ou comercial.</p></header>
    {report.metrics ? <>
      <p className="text-sm text-muted-foreground">Observações municipais completas para a janela selecionada. Sujeitas à reconciliação e à revisão do estudo.</p>
      <div className="grid gap-3 sm:grid-cols-3">{([{ label: 'Unidades lançadas na janela', value: report.metrics.launches }, { label: 'Vendas líquidas na janela', value: report.metrics.sales }, { label: 'Oferta no fechamento', value: report.metrics.stock }]).map(metric => <article key={metric.label} className="rounded-xl border bg-card p-4"><h3 className="text-sm text-muted-foreground">{metric.label}</h3><p className="mt-2 text-2xl font-semibold tabular-nums">{number(metric.value)}</p></article>)}</div>
    </> : <Alert><AlertTitle>{report.status === 'empty' ? 'Sem observações para este recorte' : 'Cobertura ainda incompleta'}</AlertTitle><AlertDescription>Não foi publicado um total consolidado. Ausência de informação não representa zero; confira os municípios e os avisos abaixo.</AlertDescription></Alert>}
    {report.issues.length > 0 && <Alert><AlertTitle>Conferências necessárias</AlertTitle><AlertDescription><ul className="list-disc space-y-1 pl-4">{report.issues.map((issue, index) => <li key={index}>{issue}</li>)}</ul></AlertDescription></Alert>}
    {report.metrics && report.cities.length > 1 && <div className="space-y-2"><h3 className="font-semibold">Consolidado mensal do conjunto</h3><BalanceTable lines={report.monthly} label="Balanço consolidado vertical" /></div>}
    {report.cities.some(city => city.monthly.length > 0) && <div className="space-y-2"><h3 className="font-semibold">Balanço por município e mês</h3><BalanceTable lines={report.cities.flatMap(city => city.monthly)} label="Balanço vertical por município" /><p className="text-xs text-muted-foreground">Diferença = oferta final informada − (oferta anterior + lançamentos − vendas líquidas). Diferenças podem envolver revisões da base; não são atribuídas automaticamente a distratos.</p></div>}
    {lines.length > 0 && <details className="min-w-0 rounded-xl border bg-card p-4"><summary className="cursor-pointer text-sm font-medium">Conferir padrões informados pela API</summary><div className="mt-4"><BalanceTable lines={lines} label="Balanço vertical por padrão" groups /></div></details>}
    <details className="rounded-xl border bg-card p-4"><summary className="cursor-pointer text-sm font-medium">Origem e horário da consulta</summary><ul className="mt-3 space-y-2 text-xs text-muted-foreground">{report.provenance.map(city => <li key={city.city}>{city.city} · início {city.startedAt} · fim {city.finishedAt} · {city.requests} requisição(ões), incluindo tentativas.</li>)}</ul><p className="mt-3 text-xs text-muted-foreground">Fontes municipais: temporal-analysis-city/releases, sales e stock, agrupadas por Padrão. Uma amostra de empreendimento confirma o recorte; não é contagem de projetos do mercado.</p></details>
    <p className="text-sm text-muted-foreground">Este quadro apresenta somente o núcleo municipal vertical. O mensal reúne os demais segmentos e o VGL em seus blocos próprios; preços e distratos brutos continuam pendentes. A prévia não representa homologação dos números.</p>
  </section>;
}
