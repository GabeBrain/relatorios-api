import type { CSSProperties, ReactNode } from 'react';
import { scopeCityLabel, type PanoramaReportModel, type ReportMarketBlock, type ReportSeries } from '../types';
import { buildMapTilePlan } from '../lib/map-tiles';
import { orderStandards, orderTypologies } from '../domain/taxonomy';

const integer = (value: number | null | undefined) => value === null || value === undefined ? '—' : value.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
const decimal = (value: number | null | undefined) => value === null || value === undefined ? '—' : value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const currency = (value: number | null | undefined) => value === null || value === undefined ? '—' : value ? `R$ ${integer(value)}` : 'R$ 0';
const percent = (value: number | null) => value === null || !Number.isFinite(value) ? '—' : `${decimal(value)}%`;
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
type SegmentKey = 'vertical' | 'horizontal' | 'total';

function Slide({ title, subtitle, children, className = '' }: { title: string; subtitle?: string; children: ReactNode; className?: string }) {
  return <div className={`panorama-market-slide ${className}`}><header><h2>{title}</h2>{subtitle && <h3>{subtitle}</h3>}<i/></header>{children}</div>;
}

function valueOf(row: { vertical: number; horizontal: number; total: number }, segment: SegmentKey) { return row[segment]; }
function last(block: ReportMarketBlock) { return block.series.at(-1) ?? { vertical: 0, horizontal: 0, total: 0 } as ReportSeries; }
function group(block: ReportMarketBlock, label: string) { return block.groupSeries.find((item) => normalize(item.label) === normalize(label)); }
function currentGroup(block: ReportMarketBlock, label: string, segment: SegmentKey) { const item = group(block, label)?.series.at(-1); return item ? valueOf(item, segment) : 0; }
function cumulativeGroup(block: ReportMarketBlock, label: string, segment: SegmentKey) { return group(block, label)?.series.reduce((sum, item) => sum + valueOf(item, segment), 0) ?? 0; }
function orderedLabels(...blocks: ReportMarketBlock[]) {
  const values = [...new Set(blocks.flatMap((block) => block.byGroup.map((row) => row.label)))];
  const normalized = values.map((value) => normalize(value));
  if (normalized.some((value) => /dorm|studio|kitnet|quarto/.test(value))) return orderTypologies(values as never);
  if (normalized.some((value) => /compacto|econom|standard|medio|alto|luxo/.test(value))) return orderStandards(values as never);
  return values.sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }));
}

function DataBar({ value, max, tone = 'green', format = integer }: { value: number; max: number; tone?: 'green' | 'red' | 'blue' | 'yellow'; format?: (value: number) => string }) {
  const size = max > 0 ? Math.min(100, Math.abs(value) / max * 100) : 0;
  return <span className={`panorama-data-bar panorama-data-bar-${tone}`} style={{ '--bar-size': `${size}%` } as CSSProperties}><i/><b>{format(value)}</b></span>;
}
function hasObservedValue(...values: (number | null | undefined)[]) { return values.some((value) => value !== null && value !== undefined && Number.isFinite(value) && value !== 0); }
function DataUnavailable({ children }: { children: ReactNode }) { return <p className="panorama-no-data">{children}</p>; }

function offerRows({ report, dimension, segment = 'vertical' }: { report: PanoramaReportModel; dimension: 'pattern' | 'typology'; segment?: SegmentKey }) {
  const granular = segment === 'vertical' && dimension === 'pattern' ? report.granular.offerByStandard : segment === 'vertical' && dimension === 'typology' ? report.granular.offerByTypology : [];
  if (granular.length) {
    const total = granular.find((row) => row.kind === 'total');
    return {
      rows: granular.filter((row) => row.kind === 'row').map((row) => ({ label: row.label, final: row.finalUnits ?? null, launched: row.launchedUnits ?? null, projects: row.projects })),
      launchedTotal: total?.launchedUnits ?? null,
      finalTotal: total?.finalUnits ?? null,
    };
  }
  const stock = dimension === 'pattern' ? report.stock.units : report.stock.unitsByTypology;
  const sales = dimension === 'pattern' ? report.sales.units : report.sales.unitsByTypology;
  const rows = orderedLabels(stock, sales).slice(0, 8).map((label) => {
    const final = currentGroup(stock, label, segment);
    const sold = cumulativeGroup(sales, label, segment);
    return { label, final, launched: final + sold };
  });
  const launchedTotal = rows.reduce((sum, row) => sum + row.launched, 0);
  const finalTotal = rows.reduce((sum, row) => sum + row.final, 0);
  return { rows: rows.map((row) => ({ ...row, projects: undefined })), launchedTotal, finalTotal };
}

export function AreaIvvSlide({ report }: { report: PanoramaReportModel }) {
  const stock = report.stock.unitsByTypology;
  const sales = report.sales.unitsByTypology;
  const ivv = report.ivvByTypology;
  const rowLabels = orderedLabels(stock, sales, ivv).slice(0, 10);
  const currentIndex = Math.max(0, stock.series.length - 1);
  const previousIndex = Math.max(0, currentIndex - 1);
  const currentTotal = rowLabels.reduce((sum, label) => sum + (group(stock, label)?.series[currentIndex]?.vertical ?? 0), 0);
  const salesTotal = rowLabels.reduce((sum, label) => sum + (group(sales, label)?.series[currentIndex]?.vertical ?? 0), 0);
  return <Slide title="OFERTA FINAL TOTAL E IVV POR ÁREA ÚTIL EM M²" subtitle="MERCADO RESIDENCIAL VERTICAL" className="panorama-area-slide">
    <table className="panorama-reference-table"><thead><tr><th>Área / tipologia</th><th>Oferta Final<br/>período anterior</th><th>Oferta Final<br/>período atual</th><th>(%)</th><th>Lançamentos</th><th>(%)</th><th>Vendas<br/>Líquidas</th><th>(%)</th><th>IVV (%)</th></tr></thead><tbody>
      {rowLabels.map((label) => { const stockSeries = group(stock, label)?.series ?? []; const salesSeries = group(sales, label)?.series ?? []; const ivvSeries = group(ivv, label)?.series ?? []; const previous = stockSeries[previousIndex]?.vertical ?? 0; const current = stockSeries[currentIndex]?.vertical ?? 0; const sold = salesSeries[currentIndex]?.vertical ?? 0; const release = Math.max(0, current + sold - previous); const ivvValue = ivvSeries[currentIndex]?.vertical ?? 0; return <tr key={label}><td>{label}</td><td>{integer(previous)}</td><td>{integer(current)}</td><td><DataBar value={currentTotal ? current / currentTotal * 100 : 0} max={100} tone="yellow" format={percent}/></td><td>{integer(release)}</td><td><DataBar value={currentTotal ? release / currentTotal * 100 : 0} max={100} format={percent}/></td><td>{integer(sold)}</td><td><DataBar value={salesTotal ? sold / salesTotal * 100 : 0} max={100} format={percent}/></td><td><DataBar value={ivvValue} max={100} tone="red" format={percent}/></td></tr>; })}
      <tr className="panorama-total-row"><td>Total</td><td>{integer(rowLabels.reduce((sum, label) => sum + (group(stock, label)?.series[previousIndex]?.vertical ?? 0), 0))}</td><td>{integer(currentTotal)}</td><td>100%</td><td>—</td><td>—</td><td>{integer(salesTotal)}</td><td>100%</td><td>{percent(last(report.ivv).vertical)}</td></tr>
    </tbody></table>
  </Slide>;
}

export function MarketSummarySlide({ report }: { report: PanoramaReportModel }) {
  const segments: { label: string; key: SegmentKey }[] = [{ label: 'Total Mercado Residencial Vertical', key: 'vertical' }, { label: 'Total Mercado Residencial Horizontal', key: 'horizontal' }, { label: 'Total Mercado', key: 'total' }];
  const final = last(report.stock.units);
  const sold = report.sales.units.series.reduce((acc, item) => ({ vertical: acc.vertical + item.vertical, horizontal: acc.horizontal + item.horizontal, total: acc.total + item.total }), { vertical: 0, horizontal: 0, total: 0 });
  const projects = report.launches.projects.reduce((acc, item) => ({ vertical: acc.vertical + item.vertical, horizontal: acc.horizontal + item.horizontal, total: acc.total + item.total }), { vertical: 0, horizontal: 0, total: 0 });
  return <Slide title="ANÁLISE GERAL DO MERCADO"><table className="panorama-reference-table panorama-summary-table"><thead><tr><th>Tipo do Imóvel</th><th>Nº de Empreend.</th><th>Oferta<br/>Lançada</th><th>Oferta<br/>Final</th><th>Disponibilidade<br/>s/ O.L.</th></tr></thead><tbody>{segments.map(({ label, key }, index) => { const finalValue = valueOf(final, key); const launched = finalValue + valueOf(sold, key); return <tr className={index === 2 ? 'panorama-total-row' : ''} key={key}><td>{label}</td><td>{integer(valueOf(projects, key))}</td><td>{integer(launched)}</td><td>{integer(finalValue)}</td><td><DataBar value={launched ? finalValue / launched * 100 : 0} max={100} tone="red" format={percent}/></td></tr>; })}</tbody></table></Slide>;
}

export function OfferTableSlide({ report, dimension, segment = 'vertical' }: { report: PanoramaReportModel; dimension: 'pattern' | 'typology'; segment?: SegmentKey }) {
  const { rows, launchedTotal, finalTotal } = offerRows({ report, dimension, segment });
  const showValueRange = dimension === 'pattern' && report.granular.valueRangeAvailable;
  const title = dimension === 'pattern' ? 'OFERTA LANÇADA E FINAL | POR PADRÃO' : 'OFERTA LANÇADA E FINAL | POR TIPOLOGIA';
  return <Slide title={title} className="panorama-offer-table-slide"><table className="panorama-reference-table"><thead><tr><th>{dimension === 'pattern' ? 'Padrão' : 'Tipologia'}</th>{dimension === 'pattern' && <>{showValueRange && <th>Faixa de Valor</th>}<th>Nº de<br/>Empreend.</th><th>(%)</th></>}<th>Oferta<br/>Lançada</th><th>(%)</th><th>Oferta Final</th><th>(%)</th><th>Disponibilidade<br/>s/ O.L.</th></tr></thead><tbody>
    {rows.map((row) => <tr key={row.label}><td>{row.label}</td>{dimension === 'pattern' && <>{showValueRange && <td>—</td>}<td>{integer(row.projects)}</td><td>{launchedTotal ? percent((row.launched ?? 0) / launchedTotal * 100) : '—'}</td></>}<td>{integer(row.launched)}</td><td><DataBar value={launchedTotal ? (row.launched ?? 0) / launchedTotal * 100 : 0} max={100} format={percent}/></td><td>{integer(row.final)}</td><td><DataBar value={finalTotal ? (row.final ?? 0) / finalTotal * 100 : 0} max={100} format={percent}/></td><td><DataBar value={row.launched ? (row.final ?? 0) / row.launched * 100 : 0} max={100} tone="red" format={percent}/></td></tr>)}
    <tr className="panorama-total-row"><td>Total</td>{dimension === 'pattern' && <>{showValueRange && <td/>}<td>{integer(rows.reduce((sum, row) => sum + (row.projects ?? 0), 0))}</td><td>100%</td></>}<td>{integer(launchedTotal)}</td><td>100%</td><td>{integer(finalTotal)}</td><td>100%</td><td>{launchedTotal ? percent((finalTotal ?? 0) / launchedTotal * 100) : '—'}</td></tr>
  </tbody></table></Slide>;
}

export function OfferChartSlide({ report, dimension }: { report: PanoramaReportModel; dimension: 'pattern' | 'typology' }) {
  const { rows, launchedTotal, finalTotal } = offerRows({ report, dimension });
  const max = Math.max(1, ...rows.flatMap((row) => [row.launched / Math.max(launchedTotal, 1), row.final / Math.max(finalTotal, 1)]));
  return <Slide title={`OFERTA LANÇADA E FINAL | POR ${dimension === 'pattern' ? 'PADRÃO' : 'TIPOLOGIA'}`} className="panorama-column-slide"><div className="panorama-column-chart">{rows.map((row) => { const launched = launchedTotal ? row.launched / launchedTotal * 100 : 0; const final = finalTotal ? row.final / finalTotal * 100 : 0; return <div className="panorama-column-group" key={row.label}><div><span className="panorama-column-green" style={{ height: `${launched / (max * 100) * 100}%` }}><b>{percent(launched)}</b></span><span className="panorama-column-yellow" style={{ height: `${final / (max * 100) * 100}%` }}><b>{percent(final)}</b></span></div><strong>{row.label}</strong></div>; })}</div><div className="panorama-chart-legend"><span className="green">Oferta Lançada</span><span className="yellow">Oferta Final</span></div></Slide>;
}

export function CohortTableSlide({ report, segment = 'vertical' }: { report: PanoramaReportModel; segment?: SegmentKey }) {
  const granularRows = segment === 'horizontal' ? report.granular.cohortsHorizontal : report.granular.cohortsVertical;
  const granularTotal = granularRows.find((row) => row.kind === 'total');
  const allRows = granularRows.length ? granularRows.filter((row) => row.kind !== 'total').map((row) => ({ label: row.label, projects: row.projects, launched: row.launchedUnits, final: row.finalUnits })) : report.market.cohorts.byGroup.map((row) => { const annual = report.launches.annual.find((item) => String(item.year) === row.label); const launched = annual ? valueOf(annual.units, segment) : 0; return { label: row.label, projects: annual ? valueOf(annual.projects, segment) : 0, launched, final: valueOf(row, segment) }; });
  const rows = allRows.filter((row) => hasObservedValue(row.projects, row.launched, row.final));
  const launchedTotal = granularRows.length ? granularTotal?.launchedUnits ?? null : rows.reduce((sum, row) => sum + (row.launched ?? 0), 0); const finalTotal = granularRows.length ? granularTotal?.finalUnits ?? null : rows.reduce((sum, row) => sum + (row.final ?? 0), 0); const projectsTotal = granularRows.length ? granularTotal?.projects ?? null : rows.reduce((sum, row) => sum + (row.projects ?? 0), 0);
  return <Slide title="OFERTA LANÇADA E FINAL | POR ANO DE LANÇAMENTO">{rows.length ? <table className="panorama-reference-table"><thead><tr><th>Ano Lançamento</th><th>Nº de<br/>Empreend.</th><th>Em %</th><th>Oferta<br/>Lançada</th><th>Em %</th><th>Oferta<br/>Final</th><th>Em %</th><th>Disponibilidade<br/>s/ O.L.</th></tr></thead><tbody>{rows.map((row) => <tr key={row.label}><td>{row.label}</td><td>{integer(row.projects)}</td><td><DataBar value={projectsTotal ? row.projects / projectsTotal * 100 : 0} max={100} format={percent}/></td><td>{integer(row.launched)}</td><td><DataBar value={launchedTotal ? row.launched / launchedTotal * 100 : 0} max={100} format={percent}/></td><td>{integer(row.final)}</td><td><DataBar value={finalTotal ? row.final / finalTotal * 100 : 0} max={100} format={percent}/></td><td><DataBar value={row.launched ? row.final / row.launched * 100 : 0} max={100} tone="red" format={percent}/></td></tr>)}<tr className="panorama-total-row"><td>Total</td><td>{integer(projectsTotal)}</td><td>100%</td><td>{integer(launchedTotal)}</td><td>100%</td><td>{integer(finalTotal)}</td><td>100%</td><td>{percent(launchedTotal ? finalTotal / launchedTotal * 100 : 0)}</td></tr></tbody></table> : <DataUnavailable>{segment === 'horizontal' ? 'A API não retornou oferta de Condomínio de Casas por ano com valores diferentes de zero neste recorte.' : 'A API não retornou oferta residencial vertical por ano com valores diferentes de zero neste recorte.'}</DataUnavailable>}</Slide>;
}

export function PriceTableSlide({ report, dimension, horizontal = false }: { report: PanoramaReportModel; dimension: 'pattern' | 'typology'; horizontal?: boolean }) {
  const granularRows = horizontal ? report.granular.horizontalPricesByStandard : dimension === 'pattern' ? report.granular.pricesByStandard : report.granular.pricesByTypology;
  const horizontalProjects = report.cube.projects.filter((project) => project.segment === 'Horizontal');
  const eligibleHorizontal = horizontalProjects.length;
  const horizontalStockIsKnown = horizontalProjects.every((project) => project.finalUnits !== null);
  const hasActiveHorizontalOffer = horizontalProjects.some((project) => (project.finalUnits ?? 0) > 0);
  const rejectedHorizontal = report.provenance.rejectedByPolicy.filter((item) => item.reason === 'horizontal_fora_da_politica' || item.reason === 'subtipo_horizontal_indefinido').reduce((sum, item) => sum + item.count, 0);
  const noPriceMessage = horizontal
    ? eligibleHorizontal === 0
      ? `Não há Condomínio de Casas elegível neste recorte${rejectedHorizontal ? `; ${rejectedHorizontal} horizontal(is) foram excluído(s) pela regra Secovi.` : '.'}`
      : horizontalStockIsKnown && !hasActiveHorizontalOffer
        ? 'Há Condomínios de Casas no histórico do recorte, porém todos estão esgotados e não possuem oferta ativa no fechamento selecionado. Por isso, não há base corrente para calcular ticket, área e R$/m² da oferta ativa.'
      : 'Há Condomínios de Casas válidos no recorte, mas os campos granulares de preço, área e R$/m² não vieram no payload. A média temporal de “Horizontal” não é usada como substituta, pois mistura loteamentos e outros subtipos fora do universo Secovi.'
    : 'A API não retornou preço, área ou R$/m² para este recorte.';
  if (granularRows.length) {
    const rows = granularRows.filter((row) => row.kind !== 'total').map((row) => ({ label: row.label, ticket: row.averageTicket, area: row.averageArea, meter: row.averagePricePerMeter }));
    const total = granularRows.find((row) => row.kind === 'total');
    if (!rows.some((row) => hasObservedValue(row.ticket, row.area, row.meter)) && !hasObservedValue(total?.averageTicket, total?.averageArea, total?.averagePricePerMeter)) return <Slide title={`TICKET, ÁREA E R$/M² PRIVATIVO MÉDIO POR ${horizontal ? 'PADRÃO' : dimension === 'pattern' ? 'PADRÃO' : 'TIPOLOGIA'}`} className="panorama-price-table-slide"><DataUnavailable>{noPriceMessage}</DataUnavailable></Slide>;
    return <Slide title={`TICKET, ÁREA E R$/m² PRIVATIVO MÉDIO POR ${horizontal ? 'PADRÃO' : dimension === 'pattern' ? 'PADRÃO' : 'TIPOLOGIA'}`} className="panorama-price-table-slide"><table className="panorama-reference-table"><thead><tr><th>Tipo Imóvel</th><th>Preço Médio</th><th>Área Priv. Média</th><th>R$/m² Privativa</th></tr></thead><tbody>{rows.map((row) => <tr key={row.label}><td>{row.label}</td><td>{currency(row.ticket)}</td><td>{integer(row.area)}</td><td>{integer(row.meter)}</td></tr>)}{total && <tr className="panorama-total-row"><td>{total.label}</td><td>{currency(total.averageTicket)}</td><td>{integer(total.averageArea)}</td><td>{integer(total.averagePricePerMeter)}</td></tr>}</tbody></table></Slide>;
  }
  if (horizontal) return <Slide title="TICKET, ÁREA E R$/M² PRIVATIVO MÉDIO POR PADRÃO" className="panorama-price-table-slide"><DataUnavailable>{noPriceMessage}</DataUnavailable></Slide>;
  const ticket = dimension === 'pattern' ? report.prices.ticket : report.prices.ticketByTypology;
  const meter = dimension === 'pattern' ? report.prices.meter : report.prices.meterByTypology;
  const rowLabels = orderedLabels(ticket, meter).slice(0, 8);
  const rows = horizontal ? [{ label: 'Casas em Cond. Fechado', ticket: last(ticket).horizontal, meter: last(meter).horizontal }] : rowLabels.map((label) => ({ label, ticket: currentGroup(ticket, label, 'vertical'), meter: currentGroup(meter, label, 'vertical') }));
  const averageTicket = rows.length ? rows.reduce((sum, row) => sum + row.ticket, 0) / rows.length : 0; const averageMeter = rows.length ? rows.reduce((sum, row) => sum + row.meter, 0) / rows.length : 0;
  return <Slide title={`TICKET, ÁREA E R$/m² PRIVATIVO MÉDIO POR ${horizontal ? 'TIPOLOGIA' : dimension === 'pattern' ? 'PADRÃO' : 'TIPOLOGIA'}`} className="panorama-price-table-slide"><table className="panorama-reference-table"><thead><tr><th>Tipo Imóvel</th><th>Preço Médio</th><th>Área Priv. Média</th><th>R$/m² Privativa</th></tr></thead><tbody>{rows.map((row) => <tr key={row.label}><td>{row.label}</td><td>{currency(row.ticket)}</td><td>{row.ticket && row.meter ? integer(row.ticket / row.meter) : '—'}</td><td><DataBar value={row.meter} max={Math.max(...rows.map((item) => item.meter), 1)} format={integer}/></td></tr>)}{!horizontal && <tr className="panorama-total-row"><td>Média Geral</td><td>{currency(averageTicket)}</td><td>{averageTicket && averageMeter ? integer(averageTicket / averageMeter) : '—'}</td><td>{integer(averageMeter)}</td></tr>}</tbody></table></Slide>;
}

export function PriceChartSlide({ report, dimension }: { report: PanoramaReportModel; dimension: 'pattern' | 'typology' }) {
  const granularRows = dimension === 'pattern' ? report.granular.pricesByStandard : report.granular.pricesByTypology;
  if (granularRows.length) {
    const rows = granularRows.filter((row) => row.kind !== 'total').map((row) => ({ label: row.label, value: row.averagePricePerMeter }));
    const average = granularRows.find((row) => row.kind === 'total')?.averagePricePerMeter ?? null;
    const max = Math.max(...rows.map((row) => row.value ?? 0), average ?? 0, 1);
    return <Slide title={`TICKET, ÁREA E R$/m² PRIVATIVO MÉDIO POR ${dimension === 'pattern' ? 'PADRÃO' : 'TIPOLOGIA'}`} className="panorama-price-chart-slide"><div className="panorama-price-bars">{rows.map((row) => <div key={row.label}><span style={{ height: `${(row.value ?? 0) / max * 100}%` }}><b>{integer(row.value)}</b></span><strong>{row.label}</strong></div>)}{average !== null && <i className="panorama-average-line" style={{ bottom: `${average / max * 100}%` }}><b>{integer(average)}</b></i>}</div><div className="panorama-chart-legend"><span className="green">Preço por {dimension === 'pattern' ? 'Padrão' : 'Tipologia'}</span><span className="yellow">Média Geral</span></div></Slide>;
  }
  const meter = dimension === 'pattern' ? report.prices.meter : report.prices.meterByTypology;
  if (meter.dataStatus === 'unavailable') {
    return <Slide title={`TICKET, ÁREA E R$/m² PRIVATIVO MÉDIO POR ${dimension === 'pattern' ? 'PADRÃO' : 'TIPOLOGIA'}`} className="panorama-price-chart-slide"><DataUnavailable>A API não disponibilizou o preço por m² para este recorte. O gráfico não usa zero como substituto de dado ausente.</DataUnavailable></Slide>;
  }
  const rows = orderedLabels(meter).slice(0, 8).map((label) => ({ label, value: meter.byGroup.find((row) => row.label === label)?.vertical ?? 0 })); const max = Math.max(...rows.map((row) => row.value), 1); const average = rows.length ? rows.reduce((sum, row) => sum + row.value, 0) / rows.length : 0;
  return <Slide title={`TICKET, ÁREA E R$/m² PRIVATIVO MÉDIO POR ${dimension === 'pattern' ? 'PADRÃO' : 'TIPOLOGIA'}`} className="panorama-price-chart-slide"><div className="panorama-price-bars">{rows.map((row) => <div key={row.label}><span style={{ height: `${row.value / max * 100}%` }}><b>{integer(row.value)}</b></span><strong>{row.label}</strong></div>)}<i className="panorama-average-line" style={{ bottom: `${average / max * 100}%` }}><b>{integer(average)}</b></i></div><div className="panorama-chart-legend"><span className="green">Preço por {dimension === 'pattern' ? 'Padrão' : 'Tipologia'}</span><span className="yellow">Média Geral</span></div></Slide>;
}

export function CohortMatrixSlide({ report, participation = false }: { report: PanoramaReportModel; participation?: boolean }) {
  const granularMatrix = participation ? report.granular.cohortMatrixParticipation : report.granular.cohortMatrix;
  if (granularMatrix.rows.length) {
    const display = (value: number | null) => value === null ? '—' : participation ? percent(value) : integer(value);
    return <Slide title={`${participation ? 'PARTICIPAÇÃO DA ' : ''}OFERTA LANÇADA E FINAL POR ANO DE LANÇAMENTO X PADRÃO`} className="panorama-cohort-matrix-slide"><table className="panorama-reference-table"><thead><tr><th>Ano de Lançamento / Padrão</th>{granularMatrix.standards.map((standard) => <th colSpan={2} key={standard}>{standard}</th>)}<th colSpan={2}>Total</th></tr><tr><th/><>{granularMatrix.standards.flatMap((standard) => [<th key={`${standard}-l`}>Lançada</th>, <th key={`${standard}-f`}>Final</th>])}</><th>Lançada</th><th>Final</th></tr></thead><tbody>{granularMatrix.rows.map((row) => <tr key={row.label}><td>{row.label}</td>{granularMatrix.standards.flatMap((standard) => [<td key={`${standard}-l`}>{display(row.cells[standard]?.launchedUnits ?? null)}</td>, <td key={`${standard}-f`}>{display(row.cells[standard]?.finalUnits ?? null)}</td>])}<td>{display(row.total.launchedUnits)}</td><td>{display(row.total.finalUnits)}</td></tr>)}</tbody></table></Slide>;
  }
  const years = [...new Set(report.market.cohortMatrix.map((row) => row.year))].sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true })); const standards = orderStandards([...new Set(report.market.cohortMatrix.map((row) => row.standard))] as never).slice(0, 7);
  const value = (year: string, standard: string) => report.market.cohortMatrix.find((row) => row.year === year && row.standard === standard)?.vertical ?? 0;
  const standardTotal = (standard: string) => years.reduce((sum, annualYear) => sum + value(annualYear, standard), 0);
  return <Slide title={`${participation ? 'PARTICIPAÇÃO DA ' : ''}OFERTA LANÇADA E FINAL POR ANO DE LANÇAMENTO X PADRÃO`} className="panorama-cohort-matrix-slide"><table className="panorama-reference-table"><thead><tr><th rowSpan={2}>Ano de<br/>Lançamento / Padrão</th>{standards.map((standard) => <th colSpan={2} key={standard}>{standard}</th>)}<th colSpan={2}>Total</th></tr><tr>{[...standards, 'Total'].flatMap((standard) => [<th key={`${standard}-l`}>Oferta<br/>Lançada</th>, <th key={`${standard}-f`}>Oferta<br/>Final</th>])}</tr></thead><tbody>{years.map((annualYear) => { const yearTotal = standards.reduce((sum, standard) => sum + value(annualYear, standard), 0); return <tr key={annualYear}><td>{annualYear}</td>{standards.flatMap((standard) => { const final = value(annualYear, standard); const total = standardTotal(standard); const display = participation ? percent(total ? final / total * 100 : 0) : integer(final); return [<td key={`${standard}-l`}>—</td>, <td key={`${standard}-f`}><DataBar value={participation ? (total ? final / total * 100 : 0) : final} max={participation ? 100 : Math.max(total, 1)} tone="green" format={() => display}/></td>]; })}<td>—</td><td><DataBar value={yearTotal} max={Math.max(...years.map((yearItem) => standards.reduce((sum, standard) => sum + value(yearItem, standard), 0)), 1)} tone="red" format={integer}/></td></tr>; })}</tbody></table></Slide>;
}

export function MaturitySlide({ report, dimension, participation = false }: { report: PanoramaReportModel; dimension: 'pattern' | 'typology'; participation?: boolean }) {
  const granularRows = dimension === 'pattern' ? report.granular.maturityByStandard : report.granular.maturityByTypology;
  if (granularRows.length) {
    const total = granularRows.find((row) => row.kind === 'total')?.final.total ?? null;
    const show = (value: number | null) => value === null ? '—' : participation ? percent(total ? value / total * 100 : null) : integer(value);
    return <Slide title={`${participation ? 'PARTICIPAÇÃO DO ' : ''}TEMPO MÉDIO DA OFERTA LANÇADA E FINAL | POR ${dimension === 'pattern' ? 'PADRÃO' : 'TIPOLOGIA'}`} className="panorama-maturity-slide"><table className="panorama-reference-table"><thead><tr><th>Tempo Médio - {dimension === 'pattern' ? 'Padrão' : 'Tipologia'}</th><th>Planta lançada</th><th>Construção lançada</th><th>Pronto lançado</th><th>Total lançado</th><th>Planta final</th><th>Construção final</th><th>Pronto final</th><th>Total final</th></tr></thead><tbody>{granularRows.map((row) => <tr key={row.label} className={row.kind === 'total' ? 'panorama-total-row' : undefined}><td>{row.label}</td><td>{show(row.launched.Planta)}</td><td>{show(row.launched.Construção)}</td><td>{show(row.launched.Pronto)}</td><td>{show(row.launched.total)}</td><td>{show(row.final.Planta)}</td><td>{show(row.final.Construção)}</td><td>{show(row.final.Pronto)}</td><td>{show(row.final.total)}</td></tr>)}</tbody></table></Slide>;
  }
  const block = dimension === 'pattern' ? report.stock.units : report.stock.unitsByTypology; const rows = orderedLabels(block).slice(0, 8).map((label) => block.byGroup.find((row) => row.label === label)!).filter(Boolean); const total = rows.reduce((sum, row) => sum + row.vertical, 0);
  return <Slide title={`${participation ? 'PARTICIPAÇÃO DO ' : ''}TEMPO MÉDIO DA OFERTA LANÇADA E FINAL | POR ${dimension === 'pattern' ? 'PADRÃO' : 'TIPOLOGIA'}`} className="panorama-maturity-slide"><table className="panorama-reference-table"><thead><tr><th rowSpan={3}>Tempo Médio -<br/>{dimension === 'pattern' ? 'Padrão' : 'Tipologia'}</th><th colSpan={4}>Oferta Lançada</th><th colSpan={4}>Oferta Final</th></tr><tr><th>Planta</th><th>Construção</th><th>Pronto</th><th>Total</th><th>Planta</th><th>Construção</th><th>Pronto</th><th>Total</th></tr><tr><th>Até 6 meses</th><th>7 a 36 meses</th><th>+ de 37 meses</th><th/><th>Até 6 meses</th><th>7 a 36 meses</th><th>+ de 37 meses</th><th/></tr></thead><tbody>{rows.map((row) => <tr key={row.label}><td>{row.label}</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>{participation ? percent(total ? row.vertical / total * 100 : 0) : integer(row.vertical)}</td></tr>)}</tbody></table><p className="panorama-coverage-caption">A API fornece o total por grupo; a distribuição Planta / Construção / Pronto permanece sem método homologado.</p></Slide>;
}

export function VgvSlide({ report }: { report: PanoramaReportModel }) {
  if (report.granular.vgv.length) {
    return <Slide title="VGV OFERTADO E DISPONÍVEL DO MERCADO TOTAL" className="panorama-vgv-slide"><table className="panorama-reference-table"><thead><tr><th>Padrão</th><th>Empreendimentos</th><th>Ticket Médio</th><th>Lançada</th><th>Final</th><th>Vendidas</th><th>Lançada (R$ mi)</th><th>Final (R$ mi)</th><th>Vendidas (R$ mi)</th></tr></thead><tbody>{report.granular.vgv.map((row) => <tr key={`${row.segment}-${row.label}`} className={row.kind !== 'row' ? 'panorama-total-row' : undefined}><td>{row.label}</td><td>{integer(row.projects)}</td><td>{currency(row.averageTicket)}</td><td>{integer(row.launchedUnits)}</td><td>{integer(row.finalUnits)}</td><td>{integer(row.soldUnits)}</td><td>{decimal(row.launchedVgvMillions)}</td><td>{decimal(row.finalVgvMillions)}</td><td>{decimal(row.soldVgvMillions)}</td></tr>)}</tbody></table></Slide>;
  }
  const rowLabels = orderedLabels(report.stock.units, report.stock.vgv, report.sales.units, report.sales.vgv).slice(0, 8);
  return <Slide title="VGV OFERTADO E DISPONÍVEL DO MERCADO TOTAL" className="panorama-vgv-slide"><table className="panorama-reference-table"><thead><tr><th rowSpan={2}>Padrão</th><th rowSpan={2}>Empreendimentos</th><th rowSpan={2}>Ticket Médio</th><th colSpan={3}>UNIDADES EM OFERTA</th><th colSpan={3}>OFERTA EM VGV</th></tr><tr><th>Lançada</th><th>Final</th><th>Vendidas</th><th>Lançada<br/>(R$ MILHÕES)</th><th>Final<br/>(R$ MILHÕES)</th><th>Vendidas<br/>(R$ MILHÕES)</th></tr></thead><tbody>{rowLabels.map((label) => { const finalUnits = currentGroup(report.stock.units, label, 'total'); const soldUnits = cumulativeGroup(report.sales.units, label, 'total'); const finalVgv = currentGroup(report.stock.vgv, label, 'total'); const soldVgv = cumulativeGroup(report.sales.vgv, label, 'total'); return <tr key={label}><td>{label}</td><td>—</td><td>{currency(currentGroup(report.prices.ticket, label, 'total'))}</td><td>{integer(finalUnits + soldUnits)}</td><td>{integer(finalUnits)}</td><td>{integer(soldUnits)}</td><td>{decimal(finalVgv + soldVgv)}</td><td>{decimal(finalVgv)}</td><td>{decimal(soldVgv)}</td></tr>; })}</tbody></table></Slide>;
}

function strongestGroup(block: ReportMarketBlock, segment: SegmentKey = 'vertical') {
  return block.byGroup.reduce<{ label: string; value: number } | null>((best, row) => {
    const value = valueOf(row, segment);
    return !best || value > best.value ? { label: row.label, value } : best;
  }, null);
}

export function NarrativeSlide({ report, continuation = false }: { report: PanoramaReportModel; continuation?: boolean }) {
  const finalStock = last(report.stock.units);
  const sold = report.sales.units.series.reduce((sum, row) => sum + row.total, 0);
  const launched = finalStock.total + sold;
  const topPattern = strongestGroup(report.stock.units, 'total');
  const topTypology = strongestGroup(report.stock.unitsByTypology, 'total');
  const firstPage = [
    <>No período analisado, o mercado residencial de <strong>{scopeCityLabel(report.scope)}</strong> reúne oferta final de <strong>{integer(finalStock.total)} unidades</strong>, sendo {integer(finalStock.vertical)} verticais e {integer(finalStock.horizontal)} horizontais.</>,
    <>A oferta lançada estimada no recorte é de <strong>{integer(launched)} unidades</strong>; a disponibilidade sobre essa base corresponde a <strong>{percent(launched ? finalStock.total / launched * 100 : 0)}</strong>.</>,
    <>O IVV do mercado total encerra o trimestre em <strong>{percent(last(report.ivv).total)}</strong>, calculado a partir dos contratos de estoque e vendas da API GeoBrain.</>,
  ];
  const secondPage = [
    <>{topPattern ? <>O padrão com maior oferta final é <strong>{topPattern.label}</strong>, com {integer(topPattern.value)} unidades disponíveis.</> : <>A distribuição da oferta por padrão não retornou dados para o recorte.</>}</>,
    <>{topTypology ? <>A tipologia de maior presença na oferta é <strong>{topTypology.label}</strong>, totalizando {integer(topTypology.value)} unidades.</> : <>A distribuição por tipologia não retornou dados para o recorte.</>}</>,
    <>O ticket médio observado é de <strong>{currency(last(report.prices.ticket).total)}</strong>, e o preço médio privativo alcança <strong>{currency(last(report.prices.meter).total)}/m²</strong>.</>,
  ];
  return <Slide title="ANÁLISES E OBSERVAÇÕES SOBRE O MERCADO" className="panorama-narrative-slide">
    <div className="panorama-narrative-kicker">{continuation ? 'LEITURA DO PRODUTO E PREÇOS' : 'SÍNTESE DO PERÍODO'}</div>
    <ul>{(continuation ? secondPage : firstPage).map((item, index) => <li key={index}>{item}</li>)}</ul>
    <p className="panorama-narrative-source">Análise automatizada a partir dos indicadores consolidados deste relatório.</p>
  </Slide>;
}

export function LocationSlide({ report }: { report: PanoramaReportModel }) {
  const mapboxAccessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN ?? '';
  const locations = report.locations.filter((item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude)
    && item.latitude >= -85.05112878 && item.latitude <= 85.05112878
    && item.longitude >= -180 && item.longitude <= 180);
  const vertical = locations.filter((item) => item.segment === 'Vertical');
  const points = vertical.length ? vertical : locations;
  const tiles = buildMapTilePlan(points, mapboxAccessToken);
  return <Slide title="EMPREENDIMENTOS VERTICAIS" className="panorama-location-slide"><div className="panorama-location-layout">
    <div className="panorama-location-map">{tiles && <><div className="panorama-map-tiles" style={{ gridTemplateColumns: `repeat(${tiles.columns}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${tiles.rows}, minmax(0, 1fr))` }}>{tiles.tiles.map((tile) => <img key={`${tile.x}-${tile.y}`} src={tile.url} crossOrigin="anonymous" alt=""/>)}</div><small className="panorama-map-attribution">© OpenStreetMap contributors · © Mapbox</small></>}
      {tiles && points.map((item, index) => { const position = tiles.positionOf(item); return <button key={`${item.name}-${index}`} title={item.name} style={{ left: `${position.left}%`, top: `${position.top}%` }}><span>{index + 1}</span></button>; })}
      {!points.length && <div className="panorama-map-empty"><strong>Localização não disponível</strong><span>A API não retornou coordenadas válidas para este recorte.</span></div>}
      {!!points.length && !tiles && <div className="panorama-map-empty"><strong>Mapa base indisponível</strong><span>Configure VITE_MAPBOX_ACCESS_TOKEN para exibir o fundo cartográfico.</span></div>}
    </div>
    <aside><h3>{scopeCityLabel(report.scope)}</h3><p>Empreendimentos residenciais verticais identificados no recorte.</p><strong>{integer(vertical.length)}</strong><span>pontos georreferenciados</span><small>Os marcadores são exibidos somente quando há latitude e longitude válidas.</small></aside>
  </div></Slide>;
}
