import type { CSSProperties, ReactNode } from 'react';
import { scopeCityLabel, type PanoramaReportModel, type ReportMarketBlock, type ReportSeries } from '../types';
import { buildMapTilePlan } from '../lib/map-tiles';
import { orderStandards, orderTypologies, typologyDisplayLabel } from '../domain/taxonomy';
import { conditionalFormat, shareOf, type ConditionalMetric } from '../domain/conditional-format';
import { SECOVI_HORIZONTAL_LABEL } from '../domain/entity-policy';

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

/**
 * Célula com formatação condicional — JG-20, JG-21, JG-23, JG-24, JG-28, JG-29 e JG-31.
 *
 * A comparação numérica vive em `domain/conditional-format`; aqui só se desenha o veredito. Os
 * cinco estados aparecem sempre com **sinal redundante à cor** (símbolo + texto acessível), porque
 * o portão transversal da matriz proíbe comunicar apenas por cor — e porque a cor é o único canal
 * que se perde na impressão em preto e branco.
 */
function CfCell({ metric, value, reference, max, format = integer, unavailable = false, tone = 'green' }: {
  metric: ConditionalMetric;
  value: number | null | undefined;
  reference?: number | null;
  max?: number | null;
  format?: (value: number | null | undefined) => string;
  unavailable?: boolean;
  tone?: 'green' | 'red' | 'blue' | 'yellow';
}) {
  const verdict = conditionalFormat(metric, { value, reference, max, unavailable });
  const text = verdict.state === 'unavailable' ? 'Indisponível' : verdict.state === 'null' ? '—' : format(value);
  return <span className={`panorama-data-bar panorama-data-bar-${tone} panorama-cf ${verdict.className}`} style={{ '--bar-size': `${verdict.intensity}%` } as CSSProperties}>
    <i/><b>{text}</b>{verdict.symbol && verdict.state !== 'null' && verdict.state !== 'unavailable' ? <em aria-hidden="true">{verdict.symbol}</em> : null}
    <span className="panorama-sr-only">{verdict.srLabel}</span>
  </span>;
}

/** Classe da linha por natureza: subtotal e total nunca se confundem com uma coorte. */
const rowClassOf = (kind: 'row' | 'subtotal' | 'total') => kind === 'total' ? 'panorama-total-row' : kind === 'subtotal' ? 'panorama-subtotal-row' : undefined;
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

/**
 * Slide 27 — JG-19. A analista apontou duas coisas: as metragens precisam seguir o formato do
 * 1T/26 e o IVV não pode aparecer todo zerado.
 *
 * As linhas passam a ser as faixas de área útil do gabarito, calculadas do cubo granular, e o IVV
 * usa a identidade reconciliada PRE-009 sobre esse mesmo cubo. Uma faixa sem base imprime `—`,
 * nunca `0,0%`.
 */
export function AreaIvvSlide({ report }: { report: PanoramaReportModel }) {
  const bands = report.granular.areaBands;
  const rows = bands.filter((row) => row.kind === 'row');
  const total = bands.find((row) => row.kind === 'total');
  if (!rows.length) {
    return <Slide title="OFERTA FINAL TOTAL E IVV POR ÁREA ÚTIL EM M²" subtitle="MERCADO RESIDENCIAL VERTICAL" className="panorama-area-slide">
      <DataUnavailable>O payload granular não trouxe área privativa por tipologia neste recorte, portanto não há base para distribuir a oferta por faixa de metragem. A página não substitui a distribuição por zeros nem por outra dimensão.</DataUnavailable>
    </Slide>;
  }
  return <Slide title="OFERTA FINAL TOTAL E IVV POR ÁREA ÚTIL EM M²" subtitle="MERCADO RESIDENCIAL VERTICAL" className="panorama-area-slide">
    <table className="panorama-reference-table"><thead><tr><th>Área útil</th><th>Oferta Final<br/>período anterior</th><th>Oferta Final<br/>período atual</th><th>(%)</th><th>Lançamentos</th><th>(%)</th><th>Vendas<br/>Líquidas</th><th>(%)</th><th>IVV (%)</th></tr></thead><tbody>
      {rows.map((row) => <tr key={row.label}>
        <td>{row.label}</td>
        <td>{integer(row.previousUnits)}</td>
        <td>{integer(row.finalUnits)}</td>
        <td><CfCell metric="share" value={shareOf(row.finalUnits, total?.finalUnits)} max={100} format={percent} tone="yellow"/></td>
        <td>{integer(row.launchedUnits)}</td>
        <td><CfCell metric="share" value={shareOf(row.launchedUnits, total?.launchedUnits)} max={100} format={percent}/></td>
        <td>{integer(row.soldUnits)}</td>
        <td><CfCell metric="share" value={shareOf(row.soldUnits, total?.soldUnits)} max={100} format={percent}/></td>
        <td><CfCell metric="ivv" value={row.ivv} reference={total?.ivv ?? null} max={100} format={percent} tone="red"/></td>
      </tr>)}
      {total && <tr className="panorama-total-row">
        <td>Total</td><td>{integer(total.previousUnits)}</td><td>{integer(total.finalUnits)}</td><td>{total.finalUnits === null ? '—' : '100%'}</td>
        <td>{integer(total.launchedUnits)}</td><td>{total.launchedUnits === null ? '—' : '100%'}</td>
        <td>{integer(total.soldUnits)}</td><td>{total.soldUnits === null ? '—' : '100%'}</td>
        <td>{percent(total.ivv)}</td>
      </tr>}
    </tbody></table>
    <p className="panorama-coverage-caption">IVV = vendas líquidas ÷ (oferta final anterior + lançamentos), calculado por faixa a partir do histórico granular por empreendimento.</p>
  </Slide>;
}

/**
 * Slide 29 — JG-20: "o mercado Horizontal precisa obrigatoriamente considerar APENAS condomínios
 * de casas".
 *
 * A página passa a ser montada **inteiramente pelo cubo**. Antes ela somava o contrato municipal,
 * que agrega todo o horizontal: em Jundiaí isso imprimia `0 empreendimentos` ao lado de `6.055`
 * unidades lançadas e `1.045` em oferta — números de loteamento sob o rótulo do universo aceito.
 * Vindo do cubo, a contagem de empreendimentos, a oferta e a disponibilidade fecham com os slides
 * 31 e 51, que sempre foram granulares.
 */
export function MarketSummarySlide({ report }: { report: PanoramaReportModel }) {
  const facts = report.closingFacts;
  const rows = [
    { label: 'Total Mercado Residencial Vertical', projects: facts.vertical.projects, launched: facts.vertical.launchedUnits, final: facts.vertical.finalUnits },
    { label: `Total Mercado Residencial Horizontal — ${SECOVI_HORIZONTAL_LABEL}`, projects: facts.horizontal.projects, launched: facts.horizontal.launchedUnits, final: facts.horizontal.finalUnits },
    { label: 'Total Mercado', projects: facts.total.projects, launched: facts.total.launchedUnits, final: facts.total.finalUnits },
  ];
  const totalAvailability = shareOf(rows[2].final, rows[2].launched);
  if (!facts.total.projects) {
    return <Slide title="ANÁLISE GERAL DO MERCADO"><DataUnavailable>O universo granular não foi coletado neste recorte, portanto não há base por empreendimento para o resumo geral. A página não reaproveita o agregado municipal, que inclui produtos horizontais fora da política Secovi.</DataUnavailable></Slide>;
  }
  return <Slide title="ANÁLISE GERAL DO MERCADO"><table className="panorama-reference-table panorama-summary-table"><thead><tr><th>Tipo do Imóvel</th><th>Nº de Empreend.</th><th>Oferta<br/>Lançada</th><th>Oferta<br/>Final</th><th>Disponibilidade<br/>s/ O.L.</th></tr></thead><tbody>
    {rows.map((row, index) => <tr className={index === 2 ? 'panorama-total-row' : ''} key={row.label}>
      <td>{row.label}</td><td>{integer(row.projects)}</td><td>{integer(row.launched)}</td><td>{integer(row.final)}</td>
      <td><CfCell metric="availability" value={shareOf(row.final, row.launched)} reference={totalAvailability} max={100} format={percent} tone="red"/></td>
    </tr>)}
  </tbody></table><p className="panorama-coverage-caption">Universo por empreendimento do cubo Secovi: verticais integrais e, no horizontal, somente {SECOVI_HORIZONTAL_LABEL}. Fecha com a oferta por padrão e com o VGV geral.</p></Slide>;
}

export function OfferTableSlide({ report, dimension, segment = 'vertical' }: { report: PanoramaReportModel; dimension: 'pattern' | 'typology'; segment?: SegmentKey }) {
  const { rows, launchedTotal, finalTotal } = offerRows({ report, dimension, segment });
  const showValueRange = dimension === 'pattern' && report.granular.valueRangeAvailable;
  const title = dimension === 'pattern' ? 'OFERTA LANÇADA E FINAL | POR PADRÃO' : 'OFERTA LANÇADA E FINAL | POR TIPOLOGIA';
  return <Slide title={title} className="panorama-offer-table-slide"><table className="panorama-reference-table"><thead><tr><th>{dimension === 'pattern' ? 'Padrão' : 'Tipologia'}</th>{dimension === 'pattern' && <>{showValueRange && <th>Faixa de Valor</th>}<th>Nº de<br/>Empreend.</th><th>(%)</th></>}<th>Oferta<br/>Lançada</th><th>(%)</th><th>Oferta Final</th><th>(%)</th><th>Disponibilidade<br/>s/ O.L.</th></tr></thead><tbody>
    {rows.map((row) => <tr key={row.label}><td>{dimension === 'typology' ? typologyDisplayLabel(row.label) : row.label}</td>{dimension === 'pattern' && <>{showValueRange && <td>—</td>}<td>{integer(row.projects)}</td><td>{shareOf(row.launched, launchedTotal) === null ? '—' : percent(shareOf(row.launched, launchedTotal))}</td></>}<td>{integer(row.launched)}</td><td><CfCell metric="share" value={shareOf(row.launched, launchedTotal)} max={100} format={percent}/></td><td>{integer(row.final)}</td><td><CfCell metric="share" value={shareOf(row.final, finalTotal)} max={100} format={percent}/></td><td><CfCell metric="availability" value={shareOf(row.final, row.launched)} reference={shareOf(finalTotal, launchedTotal)} max={100} format={percent} tone="red"/></td></tr>)}
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
  const allRows = granularRows.length ? granularRows.filter((row) => row.kind !== 'total').map((row) => ({ label: row.label, kind: row.kind, projects: row.projects, launched: row.launchedUnits, final: row.finalUnits })) : report.market.cohorts.byGroup.map((row) => { const annual = report.launches.annual.find((item) => String(item.year) === row.label); const launched = annual ? valueOf(annual.units, segment) : 0; return { label: row.label, kind: 'row' as const, projects: annual ? valueOf(annual.projects, segment) : 0, launched, final: valueOf(row, segment) }; });
  // O subtotal permanece mesmo sem valor observado: JG-22 pede a linha, e uma tabela que a esconde
  // quando o recorte é magro faz a analista procurar de novo o que já foi corrigido.
  const rows = allRows.filter((row) => row.kind === 'subtotal' || hasObservedValue(row.projects, row.launched, row.final));
  const launchedTotal = granularRows.length ? granularTotal?.launchedUnits ?? null : rows.reduce((sum, row) => sum + (row.launched ?? 0), 0); const finalTotal = granularRows.length ? granularTotal?.finalUnits ?? null : rows.reduce((sum, row) => sum + (row.final ?? 0), 0); const projectsTotal = granularRows.length ? granularTotal?.projects ?? null : rows.reduce((sum, row) => sum + (row.projects ?? 0), 0);
  return <Slide title="OFERTA LANÇADA E FINAL | POR ANO DE LANÇAMENTO">{rows.length ? <table className="panorama-reference-table"><thead><tr><th>Ano Lançamento</th><th>Nº de<br/>Empreend.</th><th>Em %</th><th>Oferta<br/>Lançada</th><th>Em %</th><th>Oferta<br/>Final</th><th>Em %</th><th>Disponibilidade<br/>s/ O.L.</th></tr></thead><tbody>{rows.map((row) => <tr key={row.label} className={rowClassOf(row.kind)}><td>{row.label}</td><td>{integer(row.projects)}</td><td><CfCell metric="share" value={shareOf(row.projects, projectsTotal)} max={100} format={percent}/></td><td>{integer(row.launched)}</td><td><CfCell metric="share" value={shareOf(row.launched, launchedTotal)} max={100} format={percent}/></td><td>{integer(row.final)}</td><td><CfCell metric="share" value={shareOf(row.final, finalTotal)} max={100} format={percent}/></td><td><CfCell metric="availability" value={shareOf(row.final, row.launched)} reference={shareOf(finalTotal, launchedTotal)} max={100} format={percent} tone="red"/></td></tr>)}<tr className="panorama-total-row"><td>Total geral</td><td>{integer(projectsTotal)}</td><td>100%</td><td>{integer(launchedTotal)}</td><td>100%</td><td>{integer(finalTotal)}</td><td>100%</td><td>{shareOf(finalTotal, launchedTotal) === null ? '—' : percent(shareOf(finalTotal, launchedTotal))}</td></tr></tbody></table> : <DataUnavailable>{segment === 'horizontal' ? 'A API não retornou oferta de Condomínio de Casas por ano com valores diferentes de zero neste recorte.' : 'A API não retornou oferta residencial vertical por ano com valores diferentes de zero neste recorte.'}</DataUnavailable>}</Slide>;
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
    // JG-23/24: "inserir formatação condicional no R$/m²". A referência é a média geral ponderada
    // da própria tabela — nunca a média simples das linhas, que não é o preço do recorte.
    const meterReference = total?.averagePricePerMeter ?? null;
    const meterMax = Math.max(...rows.map((row) => row.meter ?? 0), meterReference ?? 0, 1);
    return <Slide title={`TICKET, ÁREA E R$/m² PRIVATIVO MÉDIO POR ${horizontal ? 'PADRÃO' : dimension === 'pattern' ? 'PADRÃO' : 'TIPOLOGIA'}`} className="panorama-price-table-slide"><table className="panorama-reference-table"><thead><tr><th>Tipo Imóvel</th><th>Preço Médio</th><th>Área Priv. Média</th><th>R$/m² Privativa</th></tr></thead><tbody>{rows.map((row) => <tr key={row.label}><td>{dimension === 'typology' && !horizontal ? typologyDisplayLabel(row.label) : row.label}</td><td>{currency(row.ticket)}</td><td>{integer(row.area)}</td><td><CfCell metric="pricePerMeter" value={row.meter} reference={meterReference} max={meterMax} format={integer}/></td></tr>)}{total && <tr className="panorama-total-row"><td>{total.label}</td><td>{currency(total.averageTicket)}</td><td>{integer(total.averageArea)}</td><td>{integer(total.averagePricePerMeter)}</td></tr>}</tbody></table></Slide>;
  }
  if (horizontal) return <Slide title="TICKET, ÁREA E R$/M² PRIVATIVO MÉDIO POR PADRÃO" className="panorama-price-table-slide"><DataUnavailable>{noPriceMessage}</DataUnavailable></Slide>;
  const ticket = dimension === 'pattern' ? report.prices.ticket : report.prices.ticketByTypology;
  const meter = dimension === 'pattern' ? report.prices.meter : report.prices.meterByTypology;
  const rowLabels = orderedLabels(ticket, meter).slice(0, 8);
  const rows = horizontal ? [{ label: 'Casas em Cond. Fechado', ticket: last(ticket).horizontal, meter: last(meter).horizontal }] : rowLabels.map((label) => ({ label, ticket: currentGroup(ticket, label, 'vertical'), meter: currentGroup(meter, label, 'vertical') }));
  const averageTicket = rows.length ? rows.reduce((sum, row) => sum + row.ticket, 0) / rows.length : 0; const averageMeter = rows.length ? rows.reduce((sum, row) => sum + row.meter, 0) / rows.length : 0;
  return <Slide title={`TICKET, ÁREA E R$/m² PRIVATIVO MÉDIO POR ${horizontal ? 'TIPOLOGIA' : dimension === 'pattern' ? 'PADRÃO' : 'TIPOLOGIA'}`} className="panorama-price-table-slide"><table className="panorama-reference-table"><thead><tr><th>Tipo Imóvel</th><th>Preço Médio</th><th>Área Priv. Média</th><th>R$/m² Privativa</th></tr></thead><tbody>{rows.map((row) => <tr key={row.label}><td>{dimension === 'typology' && !horizontal ? typologyDisplayLabel(row.label) : row.label}</td><td>{currency(row.ticket)}</td><td>{row.ticket && row.meter ? integer(row.ticket / row.meter) : '—'}</td><td><CfCell metric="pricePerMeter" value={row.meter} reference={averageMeter} max={Math.max(...rows.map((item) => item.meter), 1)} format={integer}/></td></tr>)}{!horizontal && <tr className="panorama-total-row"><td>Média Geral</td><td>{currency(averageTicket)}</td><td>{averageTicket && averageMeter ? integer(averageTicket / averageMeter) : '—'}</td><td>{integer(averageMeter)}</td></tr>}</tbody></table></Slide>;
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
    // JG-27/28: a linha `Subtotal lançados após 2024` vem do próprio motor de coortes, já
    // posicionada depois do último ano, e é destacada como subtotal — não como mais uma coorte.
    // JG-28/29: na variante de participação, cada célula é julgada contra a fatia média do recorte.
    const cell = (value: number | null, key: string) => <td key={key}>{participation ? <CfCell metric="share" value={value} max={100} format={percent}/> : display(value)}</td>;
    return <Slide title={`${participation ? 'PARTICIPAÇÃO DA ' : ''}OFERTA LANÇADA E FINAL POR ANO DE LANÇAMENTO X PADRÃO`} className="panorama-cohort-matrix-slide"><table className="panorama-reference-table"><thead><tr><th>Ano de Lançamento / Padrão</th>{granularMatrix.standards.map((standard) => <th colSpan={2} key={standard}>{standard}</th>)}<th colSpan={2}>Total</th></tr><tr><th/><>{granularMatrix.standards.flatMap((standard) => [<th key={`${standard}-l`}>Lançada</th>, <th key={`${standard}-f`}>Final</th>])}</><th>Lançada</th><th>Final</th></tr></thead><tbody>{granularMatrix.rows.map((row) => <tr key={row.label} className={rowClassOf(row.kind)}><td>{row.label}</td>{granularMatrix.standards.flatMap((standard) => [cell(row.cells[standard]?.launchedUnits ?? null, `${standard}-l`), cell(row.cells[standard]?.finalUnits ?? null, `${standard}-f`)])}<td>{display(row.total.launchedUnits)}</td><td>{display(row.total.finalUnits)}</td></tr>)}</tbody></table></Slide>;
  }
  const years = [...new Set(report.market.cohortMatrix.map((row) => row.year))].sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true })); const standards = orderStandards([...new Set(report.market.cohortMatrix.map((row) => row.standard))] as never).slice(0, 7);
  const value = (year: string, standard: string) => report.market.cohortMatrix.find((row) => row.year === year && row.standard === standard)?.vertical ?? 0;
  const standardTotal = (standard: string) => years.reduce((sum, annualYear) => sum + value(annualYear, standard), 0);
  return <Slide title={`${participation ? 'PARTICIPAÇÃO DA ' : ''}OFERTA LANÇADA E FINAL POR ANO DE LANÇAMENTO X PADRÃO`} className="panorama-cohort-matrix-slide"><table className="panorama-reference-table"><thead><tr><th rowSpan={2}>Ano de<br/>Lançamento / Padrão</th>{standards.map((standard) => <th colSpan={2} key={standard}>{standard}</th>)}<th colSpan={2}>Total</th></tr><tr>{[...standards, 'Total'].flatMap((standard) => [<th key={`${standard}-l`}>Oferta<br/>Lançada</th>, <th key={`${standard}-f`}>Oferta<br/>Final</th>])}</tr></thead><tbody>{years.map((annualYear) => { const yearTotal = standards.reduce((sum, standard) => sum + value(annualYear, standard), 0); return <tr key={annualYear}><td>{annualYear}</td>{standards.flatMap((standard) => { const final = value(annualYear, standard); const total = standardTotal(standard); const display = participation ? percent(total ? final / total * 100 : 0) : integer(final); return [<td key={`${standard}-l`}>—</td>, <td key={`${standard}-f`}><DataBar value={participation ? (total ? final / total * 100 : 0) : final} max={participation ? 100 : Math.max(total, 1)} tone="green" format={() => display}/></td>]; })}<td>—</td><td><DataBar value={yearTotal} max={Math.max(...years.map((yearItem) => standards.reduce((sum, standard) => sum + value(yearItem, standard), 0)), 1)} tone="red" format={integer}/></td></tr>; })}</tbody></table></Slide>;
}

export function MaturitySlide({ report, dimension, participation = false }: { report: PanoramaReportModel; dimension: 'pattern' | 'typology'; participation?: boolean }) {
  const granularRows = dimension === 'pattern' ? report.granular.maturityByStandard : report.granular.maturityByTypology;
  if (granularRows.length) {
    /**
     * JG-30/31: "corrigir essas porcentagens, estão bem erradas".
     *
     * O defeito era um denominador só: **todas** as oito colunas — inclusive as quatro de oferta
     * lançada — eram divididas pelo total da oferta **final**. Cada coluna passa a usar o seu
     * próprio total, de modo que Planta, Construção, Pronto e Total fecham 100% cada uma, na
     * vertical. Célula sem base não vira 0%: vira `—`.
     */
    const totalRow = granularRows.find((row) => row.kind === 'total');
    const denominator = (group: 'launched' | 'final', key: 'Planta' | 'Construção' | 'Pronto' | 'total') => totalRow?.[group][key] ?? null;
    const cell = (row: typeof granularRows[number], group: 'launched' | 'final', key: 'Planta' | 'Construção' | 'Pronto' | 'total') => {
      const value = row[group][key];
      if (!participation) return value === null ? '—' : integer(value);
      if (row.kind === 'total') return value === null ? '—' : '100%';
      return <CfCell metric="share" value={shareOf(value, denominator(group, key))} max={100} format={percent}/>;
    };
    const label = dimension === 'typology' ? typologyDisplayLabel : (value: string) => value;
    return <Slide title={`${participation ? 'PARTICIPAÇÃO DO ' : ''}TEMPO MÉDIO DA OFERTA LANÇADA E FINAL | POR ${dimension === 'pattern' ? 'PADRÃO' : 'TIPOLOGIA'}`} className="panorama-maturity-slide"><table className="panorama-reference-table"><thead><tr><th>Tempo Médio - {dimension === 'pattern' ? 'Padrão' : 'Tipologia'}</th><th>Planta lançada</th><th>Construção lançada</th><th>Pronto lançado</th><th>Total lançado</th><th>Planta final</th><th>Construção final</th><th>Pronto final</th><th>Total final</th></tr></thead><tbody>{granularRows.map((row) => <tr key={row.label} className={rowClassOf(row.kind)}><td>{label(row.label)}</td>{(['launched', 'final'] as const).flatMap((group) => (['Planta', 'Construção', 'Pronto', 'total'] as const).map((key) => <td key={`${group}-${key}`}>{cell(row, group, key)}</td>))}</tr>)}</tbody></table>{participation && <p className="panorama-coverage-caption">Participação vertical: cada coluna divide o valor da linha pelo total da própria coluna, portanto Planta, Construção, Pronto e Total fecham 100% cada um.</p>}</Slide>;
  }
  const block = dimension === 'pattern' ? report.stock.units : report.stock.unitsByTypology; const rows = orderedLabels(block).slice(0, 8).map((label) => block.byGroup.find((row) => row.label === label)!).filter(Boolean); const total = rows.reduce((sum, row) => sum + row.vertical, 0);
  return <Slide title={`${participation ? 'PARTICIPAÇÃO DO ' : ''}TEMPO MÉDIO DA OFERTA LANÇADA E FINAL | POR ${dimension === 'pattern' ? 'PADRÃO' : 'TIPOLOGIA'}`} className="panorama-maturity-slide"><table className="panorama-reference-table"><thead><tr><th rowSpan={3}>Tempo Médio -<br/>{dimension === 'pattern' ? 'Padrão' : 'Tipologia'}</th><th colSpan={4}>Oferta Lançada</th><th colSpan={4}>Oferta Final</th></tr><tr><th>Planta</th><th>Construção</th><th>Pronto</th><th>Total</th><th>Planta</th><th>Construção</th><th>Pronto</th><th>Total</th></tr><tr><th>Até 6 meses</th><th>7 a 36 meses</th><th>+ de 37 meses</th><th/><th>Até 6 meses</th><th>7 a 36 meses</th><th>+ de 37 meses</th><th/></tr></thead><tbody>{rows.map((row) => <tr key={row.label}><td>{row.label}</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>{participation ? percent(total ? row.vertical / total * 100 : 0) : integer(row.vertical)}</td></tr>)}</tbody></table><p className="panorama-coverage-caption">A API fornece o total por grupo; a distribuição Planta / Construção / Pronto permanece sem método homologado.</p></Slide>;
}

export function VgvSlide({ report }: { report: PanoramaReportModel }) {
  if (report.granular.vgv.length) {
    return <Slide title="VGV OFERTADO E DISPONÍVEL DO MERCADO TOTAL" className="panorama-vgv-slide"><table className="panorama-reference-table"><thead><tr><th>Padrão</th><th>Empreendimentos</th><th>Ticket Médio</th><th>Lançada</th><th>Final</th><th>Vendidas</th><th>Lançada (R$ mi)</th><th>Final (R$ mi)</th><th>Vendidas (R$ mi)</th></tr></thead><tbody>{report.granular.vgv.map((row) => <tr key={`${row.segment}-${row.label}`} className={rowClassOf(row.kind)}><td>{row.label}</td><td>{integer(row.projects)}</td><td>{currency(row.averageTicket)}</td><td>{integer(row.launchedUnits)}</td><td>{integer(row.finalUnits)}</td><td>{integer(row.soldUnits)}</td><td>{decimal(row.launchedVgvMillions)}</td><td>{decimal(row.finalVgvMillions)}</td><td>{decimal(row.soldVgvMillions)}</td></tr>)}</tbody></table></Slide>;
  }
  const rowLabels = orderedLabels(report.stock.units, report.stock.vgv, report.sales.units, report.sales.vgv).slice(0, 8);
  return <Slide title="VGV OFERTADO E DISPONÍVEL DO MERCADO TOTAL" className="panorama-vgv-slide"><table className="panorama-reference-table"><thead><tr><th rowSpan={2}>Padrão</th><th rowSpan={2}>Empreendimentos</th><th rowSpan={2}>Ticket Médio</th><th colSpan={3}>UNIDADES EM OFERTA</th><th colSpan={3}>OFERTA EM VGV</th></tr><tr><th>Lançada</th><th>Final</th><th>Vendidas</th><th>Lançada<br/>(R$ MILHÕES)</th><th>Final<br/>(R$ MILHÕES)</th><th>Vendidas<br/>(R$ MILHÕES)</th></tr></thead><tbody>{rowLabels.map((label) => { const finalUnits = currentGroup(report.stock.units, label, 'total'); const soldUnits = cumulativeGroup(report.sales.units, label, 'total'); const finalVgv = currentGroup(report.stock.vgv, label, 'total'); const soldVgv = cumulativeGroup(report.sales.vgv, label, 'total'); return <tr key={label}><td>{label}</td><td>—</td><td>{currency(currentGroup(report.prices.ticket, label, 'total'))}</td><td>{integer(finalUnits + soldUnits)}</td><td>{integer(finalUnits)}</td><td>{integer(soldUnits)}</td><td>{decimal(finalVgv + soldVgv)}</td><td>{decimal(finalVgv)}</td><td>{decimal(soldVgv)}</td></tr>; })}</tbody></table></Slide>;
}

/**
 * Slides 53/54 — JG-36, JG-37 e JG-38.
 *
 * - JG-36: o texto perde a menção a loteamentos e à "API GeoBrain". O horizontal do Panorama
 *   Secovi é Condomínio de Casas e nada mais; a rastreabilidade da fonte continua no dossiê
 *   técnico, que é onde ela pertence — não na narrativa entregue ao cliente.
 * - JG-37: nenhum rótulo numérico solto; tipologia é lida por extenso.
 * - JG-38: preço de vertical e de Condomínio de Casas nunca são misturados numa média. Cada
 *   segmento traz o seu, ponderado pelo próprio universo; sem base, o segmento é omitido em vez de
 *   herdar o número do outro.
 */
export function NarrativeSlide({ report, continuation = false }: { report: PanoramaReportModel; continuation?: boolean }) {
  // JG-36: a narrativa deixa de ler o agregado municipal, que devolve `Loteamento Fechado` como se
  // fosse padrão — era daí que saía "o padrão com maior oferta final é Loteamento Fechado". Padrão,
  // tipologia, oferta e disponibilidade vêm do cubo, e por isso fecham com os slides 29, 31 e 51.
  const facts = report.closingFacts;
  const finalUnits = facts.total.finalUnits;
  const launchedUnits = facts.total.launchedUnits;
  const verticalFinal = facts.vertical.finalUnits;
  const horizontalFinal = facts.horizontal.finalUnits;
  const topRow = <T extends { label: string; kind: string }>(rows: T[], value: (row: T) => number | null) =>
    rows.filter((row) => row.kind === 'row').reduce<{ label: string; value: number } | null>((best, row) => {
      const current = value(row);
      return current === null || (best && current <= best.value) ? best : { label: row.label, value: current };
    }, null);
  const topPattern = topRow(report.granular.offerByStandard, (row) => row.finalUnits);
  const topTypology = topRow(report.granular.offerByTypology, (row) => row.finalUnits);
  const verticalPrices = report.granular.pricesByStandard.find((row) => row.kind === 'total');
  const horizontalPrices = report.granular.horizontalPricesByStandard.find((row) => row.kind === 'total');
  const hasHorizontal = facts.horizontal.projects > 0;
  const areaTotal = report.granular.areaBands.find((row) => row.kind === 'total');
  const firstPage = [
    <>No período analisado, o mercado residencial de <strong>{scopeCityLabel(report.scope)}</strong> reúne oferta final de <strong>{integer(finalUnits)} unidades</strong>, sendo {integer(verticalFinal)} no vertical{hasHorizontal ? <> e {integer(horizontalFinal)} em {SECOVI_HORIZONTAL_LABEL}</> : <>; não há {SECOVI_HORIZONTAL_LABEL} elegível neste recorte</>}.</>,
    <>A oferta lançada do recorte é de <strong>{integer(launchedUnits)} unidades</strong>; a disponibilidade sobre essa base corresponde a <strong>{shareOf(finalUnits, launchedUnits) === null ? '—' : percent(shareOf(finalUnits, launchedUnits))}</strong>.</>,
    <>O IVV do mercado vertical encerra o trimestre em <strong>{areaTotal?.ivv === null || areaTotal === undefined ? '—' : percent(areaTotal.ivv)}</strong>, obtido da razão entre as vendas líquidas e a soma da oferta anterior com os lançamentos do período.</>,
  ];
  const secondPage = [
    <>{topPattern ? <>O padrão com maior oferta final é <strong>{topPattern.label}</strong>, com {integer(topPattern.value)} unidades disponíveis.</> : <>A distribuição da oferta por padrão não retornou dados para o recorte.</>}</>,
    <>{topTypology ? <>A tipologia de maior presença na oferta é <strong>{typologyDisplayLabel(topTypology.label)}</strong>, totalizando {integer(topTypology.value)} unidades.</> : <>A distribuição por tipologia não retornou dados para o recorte.</>}</>,
    <>No <strong>residencial vertical</strong>, o ticket médio é de <strong>{currency(verticalPrices?.averageTicket)}</strong> e o preço privativo, <strong>{currency(verticalPrices?.averagePricePerMeter)}/m²</strong>.</>,
    <>{hasHorizontal
      ? <>Em <strong>{SECOVI_HORIZONTAL_LABEL}</strong>, os indicadores são apurados à parte: ticket médio de <strong>{currency(horizontalPrices?.averageTicket)}</strong> e <strong>{currency(horizontalPrices?.averagePricePerMeter)}/m²</strong>. Os dois segmentos não são combinados em uma média única.</>
      : <>Não há <strong>{SECOVI_HORIZONTAL_LABEL}</strong> elegível no recorte, portanto o bloco horizontal não compõe preço nem média deste panorama.</>}</>,
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
