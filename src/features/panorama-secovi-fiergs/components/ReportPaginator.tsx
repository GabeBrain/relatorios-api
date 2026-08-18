import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, FileText, ListTree, LoaderCircle } from 'lucide-react';
import { Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import type { LaunchSeries, PanoramaReportModel, ReportMarketBlock } from '../types';
import { quarterLabel, variation } from '../lib/launches';
import { PANORAMA_REPORT_MANIFEST, PANORAMA_SECTIONS, type ReportPageDefinition } from '../report/manifest';
import { buildPanoramaPdf } from '../lib/pdf-export';
import coverImage from '../assets/secovi-cover.jpg';
import footerImage from '../assets/secovi-footer.jpeg';
import '../print/panorama-print.css';

const officialSlides = import.meta.glob('../assets/official/*.png', { eager: true, import: 'default' }) as Record<string, string>;

for (const page of [1, 2, 4]) {
  officialSlides[`../assets/official/panorama-${String(page).padStart(2, '0')}.png`] =
    officialSlides[`../assets/official/panorama-${String(page).padStart(2, '0')}-neutral.png`];
}

function synchronizeOfficialCoverCity(city: string, uf: string, endQuarter: string) {
  const normalizedCity = city.toLocaleUpperCase('pt-BR');
  const reportYear = endQuarter.slice(2);
  const cityScale = Math.min(1, 12 / Math.max(normalizedCity.length, 1));
  const style = document.documentElement.style;
  style.setProperty('--panorama-city', JSON.stringify(normalizedCity));
  style.setProperty('--panorama-city-uf', JSON.stringify(`${normalizedCity} (${uf})`));
  style.setProperty('--panorama-year', JSON.stringify(reportYear));
  style.setProperty('--panorama-period', JSON.stringify(`${endQuarter[0]}ºTRI/${reportYear}`));
  style.setProperty('--panorama-city-scale', String(cityScale));
}

const n = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
const decimal = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const pct = (v: number | null) => v === null ? '—' : `${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
const year = (q: string) => q.slice(2);
function Footer() { return <footer className="panorama-page-footer panorama-official-footer" style={{ backgroundImage: `url(${footerImage})` }}><span>FONTE: BRAIN | ELABORAÇÃO: BRAIN</span></footer>; }
function Sheet({ def, children }: { def: ReportPageDefinition; report: PanoramaReportModel; children: React.ReactNode }) { const hasBakedFooter = Boolean(officialSlides[`../assets/official/panorama-${String(def.page).padStart(2, '0')}.png`]); return <section className={`panorama-report-page panorama-official-page ${hasBakedFooter ? 'panorama-baked-page' : ''}`} aria-label={`Página ${def.page}: ${def.title}`}><div className="panorama-page-content">{children}</div>{!hasBakedFooter && <Footer/>}</section>; }
function Divider({ title }: { title: string }) { return <div className="panorama-divider"><div><p>Panorama imobiliário</p><h2>{title}</h2><i/></div></div>; }
function Corporate({ page, report }: { page: number; report: PanoramaReportModel }) {
  const city = `${report.scope.city} - ${report.scope.uf}`;
  if (page === 3) return <div className="panorama-corporate"><h2>Sobre o SECOVI-SP</h2><h3>Nossa visão</h3><p>Ser reconhecido pela sociedade como a entidade mais importante na realização do maior sonho do brasileiro: a casa própria.</p><h3>Nossa missão</h3><p>Desenvolver, representar, promover e defender a atividade imobiliária em seus segmentos, dentro de padrões reconhecidamente éticos e comprometidos com os anseios da coletividade.</p><h3>Nossos valores</h3><ul>{['Presteza','Confiabilidade','Ética','Transparência','Profissionalismo','Eficácia','Inovação','Espírito de equipe'].map((x) => <li key={x}>✓ {x}</li>)}</ul></div>;
  if (page === 7) return <div className="panorama-corporate"><h2>Sobre o SECOVI-SP</h2><p>O Secovi-SP faz história desde 1946 e cumpre seu compromisso com o Estado de São Paulo por meio do desenvolvimento do setor urbano ao lado de parceiros públicos, corporativos e da grande mídia.</p><p>Seu trabalho representa empresas, viabiliza negócios, incentiva inovação e contribui para a oferta de habitação e o desenvolvimento das cidades.</p><p>O Sindicato mantém diálogo permanente com autoridades e associados, criando propostas e serviços que favorecem a urbanização, a geração de empregos e a segurança nas relações imobiliárias.</p></div>;
  if (page === 8) return <div className="panorama-corporate"><h2>Sobre o SECOVI-SP</h2><h3>Política da Qualidade:</h3><p>Fornecer aos seus associados e categorias representadas, com máxima presteza, confiabilidade e alto padrão de qualidade, informações e subsídios pertinentes ao exercício de suas atividades.</p><p>Defender ativamente os interesses dos associados dentro de padrões éticos e segundo os interesses coletivos; valorizar o crescimento gerencial e profissional da entidade; promover o espírito de equipe e a eficácia do sistema da qualidade.</p></div>;
  return <div className="panorama-corporate"><h2>Objetivos</h2><i/><p>✓ Analisar a evolução dos principais indicadores do mercado imobiliário local:</p><ol><li>Lançamentos;</li><li>Oferta;</li><li>Vendas;</li><li>Estoque; e</li><li>Evolução de preços.</li></ol><p>✓ Apresentar a evolução analítica do posicionamento das incorporadoras em <strong>{city}</strong>.</p></div>;
}
function seriesFor(page: number, r: PanoramaReportModel): { title: string; data: LaunchSeries[]; unit: 'count' | 'mi' | 'percent' | 'sqm' } {
  if ([14,15].includes(page)) return { title: page === 14 ? 'Empreendimentos lançados por trimestre' : 'Empreendimentos verticais lançados por padrão', data: r.launches.projects, unit: 'count' };
  if ([16,17].includes(page)) return { title: page === 16 ? 'Unidades lançadas por trimestre' : 'Unidades verticais lançadas por padrão', data: r.launches.units, unit: 'count' };
  if ([18,19].includes(page)) return { title: 'VGV lançado por trimestre', data: r.launches.vgv, unit: 'mi' };
  if ([23,25].includes(page)) return { title: page === 23 ? 'Unidades vendidas por trimestre' : 'Unidades verticais vendidas por padrão', data: r.sales.units.series, unit: 'count' };
  if ([24,26].includes(page)) return { title: page === 24 ? 'VGV vendido por trimestre' : 'VGV vertical vendido por padrão', data: r.sales.vgv.series, unit: 'mi' };
  return { title: 'Preço médio do m² por trimestre', data: r.prices.meter.series, unit: 'sqm' };
}
function TimeChart({ page, report }: { page: number; report: PanoramaReportModel }) {
  const series = seriesFor(page, report);
  const data = series.data.slice(-17);
  const referenceQuarter = report.scope.endQuarter[0];
  const formatValue = (value: number) => series.unit === 'mi' ? decimal(value) : series.unit === 'percent' ? pct(value) : series.unit === 'sqm' ? `R$ ${n(value)}/m²` : n(value);
  const highlighted = data.filter((row) => row.quarter[0] === referenceQuarter);
  const comparisons = highlighted.slice(-4).slice(1).map((current, index) => ({ previous: highlighted.slice(-4)[index], current }));
  const metricLabel = [14, 15].includes(page) ? 'EMPRS. LANÇADOS' : [16, 17].includes(page) ? 'UNIDS. LANÇADAS' : [18, 19].includes(page) ? 'VGL LANÇADO' : [23, 25].includes(page) ? 'UNIDS. VENDIDAS' : [24, 26].includes(page) ? 'VGV VENDIDO' : 'R$/M²';
  const renderPointLabel = (key: 'vertical' | 'horizontal', color: string, textColor: string) => (props: { index?: number; x?: number; y?: number; value?: number }) => {
    const index = props.index ?? -1;
    const row = data[index];
    if (!row || props.x === undefined || props.y === undefined || props.value === undefined) return null;
    const emphasized = row.quarter[0] === referenceQuarter;
    const yOffset = key === 'vertical' ? -10 : 18;
    const label = formatValue(Number(props.value));
    if (!emphasized) return <text className="panorama-point-label" x={props.x} y={props.y + yOffset} textAnchor="middle">{label}</text>;
    const width = Math.max(34, label.length * 7 + 12);
    return <g className="panorama-highlight-label" transform={`translate(${props.x - width / 2} ${props.y + yOffset - 13})`}><rect width={width} height={19} fill={color}/><text x={width / 2} y={13} textAnchor="middle" fill={textColor}>{label}</text></g>;
  };

  return <div className="panorama-chart">
    <div className="panorama-chart-head">
      <div><h2>{series.title}</h2><i/></div>
      <div className="panorama-variation">
        <b>VARIAÇÕES | {metricLabel}</b>
        <div className="panorama-variation-grid">
          <span aria-hidden="true"/>
          {comparisons.map(({ previous, current }) => <span key={`${previous.quarter}-${current.quarter}`}>{quarterLabel(previous.quarter)} x {quarterLabel(current.quarter)}</span>)}
          <span>Vertical</span>
          {comparisons.map(({ previous, current }) => <strong className="panorama-variation-vertical" key={`v-${current.quarter}`}>{pct(variation(current.vertical, previous.vertical))}</strong>)}
          <span>Horizontal</span>
          {comparisons.map(({ previous, current }) => <strong className="panorama-variation-horizontal" key={`h-${current.quarter}`}>{pct(variation(current.horizontal, previous.horizontal))}</strong>)}
        </div>
      </div>
    </div>
    <div className="panorama-annual-strip">{[...new Set(data.map((item) => year(item.quarter)))].map((annualYear) => {
      const rows = data.filter((item) => year(item.quarter) === annualYear);
      const total = rows.reduce((sum, row) => sum + row.total, 0);
      return <span key={annualYear}><b>{annualYear}{annualYear === year(report.scope.endQuarter) ? '*' : ''}</b>{formatValue(total)}<small>{formatValue(total / Math.max(rows.length, 1))}/trimestre</small></span>;
    })}</div>
    <ResponsiveContainer width="100%" height="62%">
      <LineChart data={data} margin={{ left: 22, right: 22, top: 26, bottom: 6 }}>
        <XAxis dataKey="quarter" tickFormatter={quarterLabel} tickLine={false} axisLine={{ stroke: '#c9c9c9' }} tick={{ fontSize: 11 }}/>
        <Tooltip formatter={(value) => formatValue(Number(value))} labelFormatter={(value) => quarterLabel(String(value) as never)}/>
        <Legend verticalAlign="bottom"/>
        <Line type="monotone" dataKey="vertical" name="Vertical" stroke="#5d7833" strokeWidth={4} dot={false} isAnimationActive={false} label={renderPointLabel('vertical', '#5d7833', '#fff')}/>
        <Line type="monotone" dataKey="horizontal" name="Cond. de Casas" stroke="#ffc400" strokeWidth={4} dot={false} isAnimationActive={false} label={renderPointLabel('horizontal', '#ffc400', '#080808')}/>
      </LineChart>
    </ResponsiveContainer>
  </div>;
}
function comparisonSeries(report: PanoramaReportModel, sales = false) { const metric = sales ? report.sales : { units: { series: report.launches.units }, vgv: { series: report.launches.vgv } }; const quarters = metric.units.series.filter((x: LaunchSeries) => x.quarter[0] === report.scope.endQuarter[0]).slice(-5); return { quarters, rows: [{ label: 'Empreendimentos', series: report.launches.projects, money: false, show: !sales }, { label: 'Unidades', series: metric.units.series, money: false, show: true }, { label: sales ? 'VGV vendido' : 'VGV lançado', series: metric.vgv.series, money: true, show: true }].filter((x) => x.show) }; }
function ComparisonTable({ report, sales = false, annual = false }: { report: PanoramaReportModel; sales?: boolean; annual?: boolean }) {
  const { quarters, rows } = comparisonSeries(report, sales);
  const periods = annual ? report.launches.annual.slice(-4).map((item) => String(item.year)) : quarters.map((item: LaunchSeries) => item.quarter);
  const comparisonPairs = [[periods.at(-3), periods.at(-2)], [periods.at(-2), periods.at(-1)]] as const;
  const get = (row: typeof rows[number], period: string, type: 'vertical' | 'horizontal' | 'total') => {
    if (annual) {
      const item = report.launches.annual.find((annualItem) => String(annualItem.year) === period);
      const key = row.label === 'Empreendimentos' ? 'projects' : row.label === 'Unidades' ? 'units' : 'vgv';
      return item?.[key][type] ?? 0;
    }
    return row.series.find((item: LaunchSeries) => item.quarter === period)?.[type] ?? 0;
  };
  const comparisonLabel = (from: string, to: string) => annual ? `${from}-${to}` : `${quarterLabel(from as never)}-${to.slice(2)}`;
  const groupLabel = (label: string) => label === 'Empreendimentos' ? label : label === 'Unidades' ? (sales ? 'Unidades Vendidas' : 'Unidades Lançadas') : (sales ? 'VGV Vendido (R$ milhões)' : 'VGL (R$ milhões)');

  return <div className="panorama-table-page panorama-comparison-table">
    <h2>{sales ? 'VENDAS' : 'LANÇAMENTOS'} <span>| {annual ? 'POR ANO' : 'POR TRIMESTRE'}</span></h2>
    <i/>
    <table>
      <thead><tr><th aria-label="Indicador"/><th>Tipo do Imóvel</th>{periods.map((period) => <th key={period}>{annual ? period : quarterLabel(period as never)}</th>)}{comparisonPairs.map(([from, to]) => from && to ? <th key={`${from}-${to}`}>{comparisonLabel(from, to)}</th> : null)}</tr></thead>
      <tbody>{rows.flatMap((row) => (['vertical', 'horizontal', 'total'] as const).map((type, rowIndex) => {
        const values = periods.map((period) => get(row, period, type));
        return <tr key={`${row.label}-${type}`} className={type === 'total' ? 'panorama-total-row' : ''}>
          {rowIndex === 0 && <th rowSpan={3} scope="rowgroup" className="panorama-group-cell">{groupLabel(row.label)}</th>}
          <td>{type === 'vertical' ? 'Residencial Vertical' : type === 'horizontal' ? 'Residencial Horizontal' : 'Total Mercado'}</td>
          {values.map((value, index) => <td key={index}>{row.money ? decimal(value) : n(value)}</td>)}
          {comparisonPairs.map(([from, to]) => {
            if (!from || !to) return null;
            const delta = variation(get(row, to, type), get(row, from, type));
            const barSize = delta === null ? 0 : Math.min(Math.abs(delta), 100);
            const tone = delta === null ? '' : delta >= 0 ? 'panorama-positive' : 'panorama-negative';
            return <td className={`panorama-variation-cell ${type === 'total' ? '' : tone}`} style={{ '--panorama-change-size': `${barSize}%` } as React.CSSProperties} key={`${from}-${to}`}>
              {type !== 'total' && delta !== null && <span className="panorama-change-bar"/>}
              <strong>{delta === null ? '-' : pct(delta)}</strong>
            </td>;
          })}
        </tr>;
      }))}</tbody>
    </table>
  </div>;
}
function CoveragePage({ title, detail }: { title: string; detail: string }) { return <div className="panorama-table-page"><h2>{title}</h2><i/><div className="panorama-coverage-notice"><strong>Dimensão em validação</strong><p>{detail}</p><span>O desenho desta página está reservado para o contrato correto; nenhum indicador de outro bloco foi reutilizado.</span></div></div>; }
function MarketTable({ title, block, groupTitle = 'Grupo' }: { title: string; block: ReportMarketBlock; groupTitle?: string }) { return <div className="panorama-table-page"><div className="flex items-start justify-between"><div><h2>{title}</h2><i/></div></div>{block.byGroup.length ? <table><thead><tr><th>{groupTitle}</th><th>Vertical</th><th>Horizontal</th><th>Total</th></tr></thead><tbody>{block.byGroup.slice(0, 9).map((row) => <tr key={row.label}><td>{row.label}</td><td>{n(row.vertical)}</td><td>{n(row.horizontal)}</td><td>{n(row.total)}</td></tr>)}</tbody></table> : <p className="panorama-no-data">A fonte foi consultada, mas não retornou linhas comparáveis neste recorte.</p>}<p className="panorama-formula">Fonte: {block.source} · {block.formula}</p></div>; }
function ParticipationPage({ title, block }: { title: string; block: ReportMarketBlock }) { const total = block.byGroup.reduce((sum, row) => sum + row.total, 0); return <div className="panorama-table-page"><h2>{title}</h2><i/><div className="panorama-participation-list">{block.byGroup.length ? block.byGroup.slice(0, 8).map((row) => <div key={row.label}><div><b>{row.label}</b><span>{total ? pct((row.total / total) * 100) : '—'}</span></div><div className="panorama-participation-track"><span style={{ width: `${total ? (row.total / total) * 100 : 0}%` }}/></div></div>) : <p className="panorama-no-data">A API não retornou grupos comparáveis neste recorte.</p>}</div></div>; }
function SummaryMatrix({ title, block }: { title: string; block: ReportMarketBlock }) { return <div className="panorama-table-page"><h2>{title}</h2><i/><div className="panorama-summary-matrix">{['Vertical','Horizontal','Mercado total'].map((label, index) => { const value = index === 0 ? block.series.at(-1)?.vertical ?? 0 : index === 1 ? block.series.at(-1)?.horizontal ?? 0 : block.series.at(-1)?.total ?? 0; return <div key={label}><span>{label}</span><strong>{n(value)}</strong><small>{block.unit === 'brl_millions' ? 'R$ milhões' : 'unidades / indicador'}</small></div>; })}</div><p className="panorama-formula">Fonte: {block.source} · {block.formula}</p></div>; }
function dataPage(page: number, r: PanoramaReportModel) { if ([12,13].includes(page)) return <ComparisonTable report={r} annual={page === 13}/>; if ([21,22].includes(page)) return <ComparisonTable report={r} sales annual={page === 22}/>; if ([14,15,16,17,18,19,23,24,25,26,40].includes(page)) return <TimeChart page={page} report={r}/>; if (page === 27) return <SummaryMatrix title="Oferta, lançamentos, vendas e IVV por área útil" block={r.ivv}/>; if (page === 29) return <SummaryMatrix title="Análise geral do mercado" block={r.stock.units}/>; if ([31,34].includes(page)) return <MarketTable title={page === 31 ? 'Oferta lançada e final por padrão' : 'Oferta lançada e final por tipologia'} block={r.stock.units} groupTitle={page === 31 ? 'Padrão' : 'Tipologia'}/>; if ([32,35].includes(page)) return <ParticipationPage title={page === 32 ? 'Participação da oferta por padrão' : 'Participação da oferta por tipologia'} block={r.stock.units}/>; if ([36,38,49].includes(page)) return <MarketTable title={page === 36 ? 'Ticket, área e R$/m² por tipologia' : page === 38 ? 'Ticket, área e R$/m² por padrão' : 'Ticket, área e R$/m² horizontal'} block={r.prices.ticket} groupTitle={page === 38 ? 'Padrão' : page === 49 ? 'Condomínio' : 'Tipologia'}/>; if ([37,39].includes(page)) return <ParticipationPage title={page === 37 ? 'R$/m² por tipologia' : 'R$/m² por padrão'} block={r.prices.meter}/>; if (page === 51) return <SummaryMatrix title="VGV ofertado e disponível do mercado total" block={r.stock.vgv}/>; if ([33,41,48].includes(page)) return <MarketTable title={PANORAMA_REPORT_MANIFEST[page - 1].title} block={r.market.cohorts} groupTitle="Ano de lançamento"/>; if (page === 42) return <ParticipationPage title="Participação da oferta por ano de lançamento" block={r.market.cohorts}/>; if ([43,44,45,46].includes(page)) return <CoveragePage title={PANORAMA_REPORT_MANIFEST[page - 1].title} detail="A regra oficial de maturidade (Planta, Construção e Pronto) aguarda homologação."/>; return null; }
function Content({ def, report }: { def: ReportPageDefinition; report: PanoramaReportModel }) { const title = def.title.replace('{cidade}', report.scope.city); const p = def.page; const official = officialSlides[`../assets/official/panorama-${String(p).padStart(2, '0')}.png`]; if (official) return <img className="panorama-static-slide" src={official} alt={`Slide oficial ${p} do Panorama`}/>; if (p === 1 || p === 2 || p === 4) return <div className="panorama-cover" style={{ backgroundImage: `linear-gradient(90deg, rgba(100,0,0,.15), rgba(100,0,0,.2)), url(${coverImage})` }}><div><p>Pesquisa de mercado</p><h1>{p === 4 ? `Panorama Imobiliário de ${report.scope.city}` : report.scope.city}</h1><h2>{quarterLabel(report.scope.endQuarter)} · {report.scope.endQuarter.slice(2)}</h2></div></div>; if ([6,9,11,20,28,30,47,50,52,55,57].includes(p)) return <Divider title={title}/>; if ([3,7,8,10].includes(p)) return <Corporate page={p} report={report}/>; if (p === 5) return <div className="panorama-corporate"><h2>Sumário</h2><ol className="panorama-summary">{PANORAMA_SECTIONS.map((section) => <li key={section.id}>{section.label}</li>)}</ol></div>; if (p === 53 || p === 54) return <div className="panorama-corporate"><h2>Análises e observações</h2><p>Com base no recorte {report.scope.city}/{report.scope.uf}, foram observados {n(report.launches.projects.reduce((sum, row) => sum + row.total, 0))} empreendimentos lançados na janela trimestral apresentada.</p><p>As métricas de vendas, estoque, IVV e preço exibidas neste relatório são provenientes da API GeoBrain e seguem os contratos e fórmulas documentados para este recorte.</p></div>; if (p === 56) { const lats = report.locations.map((x) => x.latitude); const lons = report.locations.map((x) => x.longitude); if (!lats.length) return <div className="panorama-map"><h2>Localização dos empreendimentos verticais</h2><p className="panorama-no-data">Dimensão não coberta pela API neste recorte.</p></div>; const minLat = Math.min(...lats), maxLat = Math.max(...lats), minLon = Math.min(...lons), maxLon = Math.max(...lons); return <div className="panorama-map"><h2>Localização dos empreendimentos verticais</h2><div className="panorama-map-canvas">{report.locations.filter((x) => x.segment === 'Vertical').map((x) => <span key={`${x.name}-${x.latitude}`} title={x.name} style={{ left: `${12 + 76 * (x.longitude - minLon) / Math.max(maxLon - minLon, .0001)}%`, top: `${12 + 70 * (maxLat - x.latitude) / Math.max(maxLat - minLat, .0001)}%` }}/>)}</div><p>{n(report.locations.filter((x) => x.segment === 'Vertical').length)} empreendimentos verticais com coordenadas válidas retornadas pela API.</p></div>; } return dataPage(p, report) ?? <div className="panorama-corporate"><h2>{title}</h2><p>Conteúdo editorial do relatório.</p></div>; }
export function ReportPaginator({ report }: { report: PanoramaReportModel }) {
  const [current, setCurrent] = useState(0); const [exportState, setExportState] = useState<'idle' | 'preparing' | 'capturing' | 'assembling' | 'error'>('idle'); const [progress, setProgress] = useState(0);
  const exportRoot = useRef<HTMLDivElement>(null); const pages = useMemo(() => PANORAMA_REPORT_MANIFEST, []); const page = pages[current];
  useEffect(() => { synchronizeOfficialCoverCity(report.scope.city, report.scope.uf, report.scope.endQuarter); }, [report.scope.city, report.scope.uf, report.scope.endQuarter]);
  const jump = (number: number) => setCurrent(Math.max(0, pages.findIndex((item) => item.page === number)));
  const exportPdf = async () => { const popup = window.open('', '_blank'); setExportState('preparing'); setProgress(0); try { const slides = [...(exportRoot.current?.querySelectorAll<HTMLElement>('.panorama-report-page') ?? [])]; setExportState('capturing'); const result = await buildPanoramaPdf(slides, { title: `Panorama imobiliário de ${report.scope.city}`, author: 'Brain Inteligência Estratégica', subject: `${report.scope.city}/${report.scope.uf} · ${quarterLabel(report.scope.endQuarter)}` }, ({ current: rendered }) => { setProgress(rendered); if (rendered === slides.length) setExportState('assembling'); }); const url = URL.createObjectURL(result.blob); if (popup) popup.location.href = url; else { const link = document.createElement('a'); link.href = url; link.download = `panorama-${report.scope.city.toLowerCase().replaceAll(' ', '-')}-${report.scope.endQuarter}.pdf`; link.click(); } setExportState('idle'); } catch { popup?.close(); setExportState('error'); } };
  return <div className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><FileText className="h-4 w-4 text-primary"/><span className="text-sm font-medium">Página {page.page} de {pages.length} · {page.intention}</span></div><div className="flex gap-2"><Button variant="outline" size="sm" disabled={!current} onClick={() => setCurrent((v) => v - 1)}><ChevronLeft/>Anterior</Button><Button variant="outline" size="sm" disabled={current === pages.length - 1} onClick={() => setCurrent((v) => v + 1)}>Próxima<ChevronRight/></Button><Button size="sm" disabled={exportState !== 'idle'} onClick={exportPdf}>{exportState === 'idle' ? <Download/> : <LoaderCircle className="animate-spin"/>}{exportState === 'idle' ? 'Visualizar PDF' : `${exportState === 'capturing' ? `${progress}/${pages.length}` : 'Preparando PDF…'}`}</Button></div></div>{exportState === 'error' && <p className="text-sm text-destructive">Não foi possível montar o PDF. Revise o recorte e tente novamente.</p>}<div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]"><aside className="rounded-xl border bg-card p-3"><div className="mb-2 flex items-center gap-2 text-sm font-semibold"><ListTree className="h-4 w-4"/>Sumário</div>{PANORAMA_SECTIONS.map((section) => <button key={section.id} type="button" className={`block w-full rounded-md px-2 py-2 text-left text-xs transition-colors ${page.sectionId === section.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`} onClick={() => jump(section.start)}>{section.label}<span className="ml-1 text-muted-foreground">{section.start}–{section.end}</span></button>)}</aside><Sheet def={page} report={report}><Content def={page} report={report}/></Sheet></div><div ref={exportRoot} className="panorama-export-root" aria-hidden="true">{pages.map((def) => <Sheet key={def.page} def={def} report={report}><Content def={def} report={report}/></Sheet>)}</div></div>;
}
