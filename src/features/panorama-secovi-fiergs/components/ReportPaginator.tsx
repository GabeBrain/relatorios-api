import { Component, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Download, FileText, ListTree, LoaderCircle, Presentation } from 'lucide-react';
import { Bar, BarChart, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { scopeCityLabel, type LaunchSeries, type PanoramaReportModel, type ReportMarketBlock } from '../types';
import { quarterLabel, variation } from '../lib/launches';
import { compactQuarterLabel, visiblePointLabelIndexes, visibleQuarterTickIndexes } from '../lib/chart-labels';
import { downloadFiergsAudit } from '../lib/fiergs-audit';
import { conditionalFormat } from '../domain/conditional-format';
import { horizontalLabelForEntity } from '../domain/entity-policy';
import { createPanoramaSections, panoramaManifestFor, type ReportPageDefinition } from '../report/manifest';

/** Token do fundo cartográfico: define, junto das coordenadas, se a lâmina de mapa existe (JG-39). */
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN ?? '';
import { panoramaExportIsRunning, usePanoramaExportStore } from '../export-store';
import { AreaIvvSlide, CohortMatrixSlide, CohortTableSlide, FiergsHorizontalOfferSlide, FiergsHorizontalPriceRangeSlide, LocationSlide, MarketSummarySlide, MaturitySlide, NarrativeSlide, OfferChartSlide, OfferTableSlide, PriceChartSlide, PriceTableSlide, VgvSlide } from './MarketSlides';
import coverBackground from '../assets/official_v2/backgrounds/cover-report.png';
import contentBackground from '../assets/official_v2/backgrounds/content.png';
import dividerBackground from '../assets/official_v2/backgrounds/divider.png';
import darkTeamBackground from '../assets/official_v2/backgrounds/dark-team.png';
import closingBackground from '../assets/official_v2/backgrounds/closing-report.png';
import { FIERGS_INSTITUTIONAL_SLIDES, FIERGS_REGION_MAP, FIERGS_SECTION_DIVIDER } from '../assets/fiergs';
import '../print/panorama-print.css';

const officialV2Assets = import.meta.glob('../assets/official_v2/*.png', { eager: true, import: 'default' }) as Record<string, string>;
const officialV2 = (name: string) => officialV2Assets[`../assets/official_v2/${name}`];

const V2_DIVIDERS = new Set([6, 9, 11, 20, 28, 30, 47, 50, 52, 55, 57]);
function v2Background(referenceSlide: number): string {
  if (referenceSlide === 2) return coverBackground;
  if (V2_DIVIDERS.has(referenceSlide)) return dividerBackground;
  if ([58, 59].includes(referenceSlide)) return darkTeamBackground;
  if (referenceSlide >= 60) return closingBackground;
  return contentBackground;
}


const n = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
const decimal = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const pct = (v: number | null) => v === null ? '—' : `${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
const year = (q: string) => q.slice(2);
function Sheet({ def, report, children }: { def: ReportPageDefinition; report: PanoramaReportModel; children: React.ReactNode }) {
  const fiergs = report.scope.entity === 'fiergs-rs';
  const background = fiergs ? fiergsBackground(def) : v2Background(def.referenceSlide);
  const style = { backgroundImage: background ? `url(${background})` : 'none' } as CSSProperties;
  return <section className={`panorama-report-page panorama-official-page panorama-v2-page ${fiergs ? 'panorama-fiergs-page' : ''}`} style={style} aria-label={`Página ${def.page}: ${def.title}`}><div className="panorama-page-content">{children}</div></section>;
}
class ReportPageBoundary extends Component<{ page: number; fallback: ReactNode; children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error) { console.error(`Falha ao renderizar a página ${this.props.page} do Panorama`, error); }
  render() { return this.state.error ? this.props.fallback : this.props.children; }
}
function Corporate({ page, report }: { page: number; report: PanoramaReportModel }) {
  const city = `${scopeCityLabel(report.scope)} - ${report.scope.uf}`;
  if (report.scope.entity === 'fiergs-rs') {
    if ([3, 7].includes(page)) return <div aria-hidden="true"/>;
    if (page === 8) return <div className="panorama-corporate"><h2>Sobre o estudo FIERGS</h2><p>Panorama do mercado imobiliário residencial da Região Metropolitana de Porto Alegre.</p><p>O universo consolida as cidades monitoradas e separa o mercado vertical dos quatro produtos residenciais horizontais definidos na metodologia.</p></div>;
  }
  if (page === 3) return <div className="panorama-corporate"><h2>Sobre o SECOVI-SP</h2><h3>Nossa visão</h3><p>Ser reconhecido pela sociedade como a entidade mais importante na realização do maior sonho do brasileiro: a casa própria.</p><h3>Nossa missão</h3><p>Desenvolver, representar, promover e defender a atividade imobiliária em seus segmentos, dentro de padrões reconhecidamente éticos e comprometidos com os anseios da coletividade.</p><h3>Nossos valores</h3><ul>{['Presteza','Confiabilidade','Ética','Transparência','Profissionalismo','Eficácia','Inovação','Espírito de equipe'].map((x) => <li key={x}>✓ {x}</li>)}</ul></div>;
  if (page === 7) return <div className="panorama-corporate"><h2>Sobre o SECOVI-SP</h2><p>O Secovi-SP faz história desde 1946 e cumpre seu compromisso com o Estado de São Paulo por meio do desenvolvimento do setor urbano ao lado de parceiros públicos, corporativos e da grande mídia.</p><p>Seu trabalho representa empresas, viabiliza negócios, incentiva inovação e contribui para a oferta de habitação e o desenvolvimento das cidades.</p><p>O Sindicato mantém diálogo permanente com autoridades e associados, criando propostas e serviços que favorecem a urbanização, a geração de empregos e a segurança nas relações imobiliárias.</p></div>;
  if (page === 8) return <div className="panorama-corporate"><h2>Sobre o SECOVI-SP</h2><h3>Política da Qualidade:</h3><p>Fornecer aos seus associados e categorias representadas, com máxima presteza, confiabilidade e alto padrão de qualidade, informações e subsídios pertinentes ao exercício de suas atividades.</p><p>Defender ativamente os interesses dos associados dentro de padrões éticos e segundo os interesses coletivos; valorizar o crescimento gerencial e profissional da entidade; promover o espírito de equipe e a eficácia do sistema da qualidade.</p></div>;
  return <div className="panorama-corporate"><h2>Objetivos</h2><i/><p>✓ Analisar a evolução dos principais indicadores do mercado imobiliário local:</p><ol><li>Lançamentos;</li><li>Oferta;</li><li>Vendas;</li><li>Estoque; e</li><li>Evolução de preços.</li></ol><p>✓ Apresentar a evolução analítica do posicionamento das incorporadoras em <strong>{city}</strong>.</p></div>;
}
function V2Divider({ title }: { title: string }) { return <div className="panorama-v2-divider"><h2>{title}</h2></div>; }
function FiergsCityScope({ report }: { report: PanoramaReportModel }) {
  return <div className="panorama-fiergs-city-scope"><p>RECORTE DO ESTUDO</p><h2>CIDADES ANALISADAS</h2><div>{report.scope.cities.filter(Boolean).map((city) => <span key={city}>{city}</span>)}</div><small>Região Metropolitana de Porto Alegre · município de Porto Alegre não incluído no universo analisado</small></div>;
}
function FiergsTerritorialCover({ report }: { report: PanoramaReportModel }) {
  return <div className="panorama-fiergs-territorial"><img src={FIERGS_REGION_MAP} alt="Mapa da Região Metropolitana de Porto Alegre"/><div><p>RECORTE FIERGS</p><h1>REGIÃO<br/>METROPOLITANA<br/>DE PORTO ALEGRE</h1><strong>{quarterLabel(report.scope.endQuarter)}</strong><small>10 municípios analisados · Porto Alegre exibida somente como referência geográfica</small></div></div>;
}
function FiergsStudyCover({ report }: { report: PanoramaReportModel }) {
  return <div className="panorama-fiergs-study-cover"><p>PANORAMA DO MERCADO IMOBILIÁRIO</p><h1>RM PORTO ALEGRE</h1><i/><strong>{quarterLabel(report.scope.endQuarter)}</strong></div>;
}
function CityCover({ report }: { report: PanoramaReportModel }) {
  const cities = report.scope.cities.filter(Boolean);
  if (report.scope.entity === 'fiergs-rs') return <div aria-label="Capa institucional FIERGS"/>;
  return <div className={`panorama-v2-city-cover ${report.scope.entity === 'fiergs-rs' ? 'is-fiergs' : ''}`}><div className="panorama-v2-city-cover-copy"><p>{report.scope.entity === 'fiergs-rs' ? 'PANORAMA FIERGS · RM PORTO ALEGRE' : 'PANORAMA IMOBILIÁRIO DE'}</p><h1>{cities.map((city) => <span key={city}>{city}</span>)}</h1><strong>{quarterLabel(report.scope.endQuarter)}</strong></div></div>;
}
function V2Summary({ report }: { report: PanoramaReportModel }) {
  const sections = createPanoramaSections(panoramaManifestFor(report, MAPBOX_TOKEN), report.scope.entity);
  return <div className="panorama-v2-summary"><h2>Sumário</h2><ol>{sections.map((section) => <li key={section.id}><span>{section.label}</span><b>{section.start}–{section.end}</b></li>)}</ol></div>;
}
type PresentationPerson = NonNullable<PanoramaReportModel['presentation']['consultant']>;
function PersonSlot({ person, label, quiet = false }: { person?: PresentationPerson; label: string; quiet?: boolean }) {
  return <div className={`panorama-v2-person-slot ${person?.photoUrl ? 'is-filled' : ''} ${quiet ? 'is-quiet' : ''}`}>{person?.photoUrl ? <img src={person.photoUrl} alt={person.name ?? label}/> : !quiet && <span className="panorama-v2-person-placeholder">{label}</span>}{(person?.name || person?.role || person?.email) && <div><strong>{person.name}</strong><small>{person.role}</small>{person.email && <small>{person.email}</small>}</div>}</div>;
}
/**
 * JG-40: "'Foto do Consultor' está sem foto". Com foto, a imagem entra com `alt`. Sem foto, a
 * lâmina não exibe moldura tracejada nem o texto do slot: um espaço vazio rotulado é justamente o
 * que chegou ao cliente. O encerramento vale por si; a identificação, quando existir, é textual.
 */
function ConsultantClosing({ report }: { report: PanoramaReportModel }) {
  const consultant = report.presentation.consultant;
  const hasPhoto = Boolean(consultant?.photoUrl);
  return <div className={`panorama-v2-consultant ${hasPhoto ? '' : 'is-photoless'}`}>{hasPhoto && <PersonSlot person={consultant} label={consultant?.name ?? 'Consultor responsável'}/>}<div className="panorama-v2-consultant-copy"><h2>Obrigado pela atenção</h2>{consultant?.name ? <><strong>{consultant.name}</strong><span>{consultant.role}</span>{consultant.email && <small>{consultant.email}</small>}</> : null}</div></div>;
}
const fixedTeam = [{ name: 'Fábio Tadeu Araújo', role: 'CEO', photo: 'team-fabio.png' }, { name: 'Marcos Kahtalian', role: 'Sócio-Fundador', photo: 'team-marcos.png' }, { name: 'Teresa Cristina', role: 'Sócia e Gestora de Projetos', photo: 'team-teresa.png' }];
function TeamSlide({ report }: { report: PanoramaReportModel }) {
  const analysts = report.presentation.analysts ?? [];
  return <div className="panorama-v2-team"><div className="panorama-v2-team-grid">{fixedTeam.map((member) => <div className="panorama-v2-team-member" key={member.name}><img src={officialV2(member.photo)} alt={member.name}/><strong>{member.name}</strong><small>{member.role}</small></div>)}{[0, 1, 2].map((index) => <PersonSlot key={index} person={analysts[index]} label="" quiet/>)}</div><h2>Equipe técnica</h2></div>;
}
type TrendConfig = { title: string; data: LaunchSeries[]; unit: 'count' | 'mi' | 'sqm'; pattern?: boolean; single?: boolean; /** JG-25: a série de preço no tempo é barra, não linha. */ bars?: boolean; metric: string; nouns: [string, string]; colors: [string, string] };
function launchPatternSeries(source: { quarter: string; economic: number | null; other: number | null }[]): LaunchSeries[] { return source.map((item) => ({ quarter: item.quarter as never, vertical: item.economic ?? 0, horizontal: item.other ?? 0, total: (item.economic ?? 0) + (item.other ?? 0) })); }
function marketPatternSeries(block: ReportMarketBlock): LaunchSeries[] { const economic = block.groupSeries.find((group) => /econ/i.test(group.label)); return block.series.map((total, index) => { const economicValue = economic?.series[index]?.vertical ?? 0; return { quarter: total.quarter, vertical: economicValue, horizontal: Math.max(0, total.vertical - economicValue), total: total.vertical }; }); }
function seriesFor(page: number, r: PanoramaReportModel): TrendConfig {
  if (page === 14) return { title: 'Empreendimentos lançados por trimestre', data: r.launches.projects, unit: 'count', metric: 'EMPRS. LANÇADOS', nouns: ['Vertical', 'Cond. de Casas'], colors: ['#5b7537', '#ffc000'] };
  if (page === 15) return { title: 'Empreendimentos lançados por padrão por trimestre', data: launchPatternSeries(r.launches.projectStandards), unit: 'count', pattern: true, metric: 'EMPRS. LANÇADOS', nouns: ['Econômico', 'Demais Padrões'], colors: ['#c00000', '#858585'] };
  if (page === 16) return { title: 'Unidades lançadas por trimestre', data: r.launches.units, unit: 'count', metric: 'UNIDS. LANÇADAS', nouns: ['Vertical', 'Cond. de Casas'], colors: ['#5b7537', '#ffc000'] };
  if (page === 17) return { title: 'Unidades lançadas por padrão por trimestre', data: launchPatternSeries(r.launches.unitStandards), unit: 'count', pattern: true, metric: 'UNIDS. LANÇADAS', nouns: ['Econômico', 'Demais Padrões'], colors: ['#c00000', '#858585'] };
  if (page === 18) return { title: 'VGV lançado por trimestre (em R$ milhões)', data: r.launches.vgv, unit: 'mi', metric: 'VGL LANÇADO', nouns: ['Vertical', 'Cond. de Casas'], colors: ['#5b7537', '#ffc000'] };
  if (page === 19) return { title: 'VGV lançado por padrão por trimestre (em R$ milhões)', data: launchPatternSeries(r.launches.vgvStandards), unit: 'mi', pattern: true, metric: 'VGL LANÇADO', nouns: ['Econômico', 'Demais Padrões'], colors: ['#c00000', '#858585'] };
  if (page === 23) return { title: 'Unidades vendidas por trimestre', data: r.sales.units.series, unit: 'count', metric: 'UNIDS. VENDIDAS', nouns: ['Vertical', 'Cond. de Casas'], colors: ['#5b7537', '#ffc000'] };
  if (page === 24) return { title: 'VGV vendido por trimestre (em R$ milhões)', data: r.sales.vgv.series, unit: 'mi', metric: 'VGV VENDIDO', nouns: ['Vertical', 'Cond. de Casas'], colors: ['#5b7537', '#ffc000'] };
  if (page === 25) return { title: 'Unidades vendidas por padrão por trimestre', data: marketPatternSeries(r.sales.units), unit: 'count', pattern: true, metric: 'UNIDS. VENDIDAS', nouns: ['Econômico', 'Demais Padrões'], colors: ['#c00000', '#858585'] };
  if (page === 26) return { title: 'VGV vendido por padrão por trimestre (em R$ milhões)', data: marketPatternSeries(r.sales.vgv), unit: 'mi', pattern: true, metric: 'VGV VENDIDO', nouns: ['Econômico', 'Demais Padrões'], colors: ['#c00000', '#858585'] };
  return { title: 'Preço por m² priv. médio total residencial vertical', data: r.prices.meter.series, unit: 'sqm', single: true, bars: true, metric: 'R$/M²', nouns: ['Preço por m²', ''], colors: ['#5b7537', '#ffc000'] };
}
/**
 * JG-07 — regra de rótulo dos gráficos temporais, exigida em nove páginas (12–17 e 21–24).
 *
 * Duas decisões que a analista corrigiu de uma vez:
 *
 * - `render` é sempre verdadeiro para um valor observado, **inclusive zero**. Zero é resultado; era
 *   a supressão do zero que fazia o 2T26 sumir dos gráficos onde não houve lançamento.
 * - `plate` identifica o trimestre **pelo seu valor**, não pela posição na série: só o trimestre de
 *   fechamento recebe a placa; os demais ficam sem fundo, com o texto contornado.
 */
export function pointLabelPlan(value: number | null | undefined, quarter: string, referenceQuarter: string): { render: boolean; plate: 'chip' | 'none' } {
  const render = value !== null && value !== undefined && Number.isFinite(value);
  return { render, plate: quarter[0] === referenceQuarter ? 'chip' : 'none' };
}

function TimeChart({ page, report }: { page: number; report: PanoramaReportModel }) {
  const series = seriesFor(page, report);
  if (page === 40 && report.prices.meter.dataStatus === 'unavailable') {
    return <CoveragePage title="PREÇO POR M² PRIV. MÉDIO TOTAL RESIDENCIAL VERTICAL" detail="A API não disponibilizou a série temporal de R$/m² para este recorte. O gráfico foi mantido indisponível para não representar ausência de resposta como preço igual a zero."/>;
  }
  const data = series.data;
  // JG-13 a JG-18: com Condomínio de Casas aceito, o contrato municipal não sabe separá-lo dos
  // demais horizontais. A segunda linha desaparece — publicar a série agregada sob o rótulo
  // `Cond. de Casas` seria atribuir venda de loteamento ao universo Secovi.
  const salesPage = [23, 24, 25, 26].includes(page);
  const hideCompanion = salesPage && !series.pattern && !report.horizontalSeries.attributable;
  const referenceQuarter = report.scope.endQuarter[0];
  const formatValue = (value: number) => series.unit === 'mi' ? decimal(value) : series.unit === 'sqm' ? `R$ ${n(value)}/m²` : n(value);
  const highlighted = data.filter((row) => row.quarter[0] === referenceQuarter);
  const comparisons = highlighted.slice(-4).slice(1).map((current, index) => ({ previous: highlighted.slice(-4)[index], current }));
  const renderPointLabel = (key: 'vertical' | 'horizontal', color: string, textColor: string) => (props: { index?: number; x?: number; y?: number; value?: number }) => {
    const index = props.index ?? -1;
    const row = data[index];
    if (!row || props.x === undefined || props.y === undefined || props.value === undefined) return null;
    // JG-07: "mesmo que o rótulo seja 0, precisa aparecer". Zero é um resultado observado; era a
    // supressão do zero que apagava o 2T26 dos gráficos em que a analista notou o dado faltando.
    const plan = pointLabelPlan(props.value, row.quarter, referenceQuarter);
    if (!plan.render) return null;
    const emphasized = plan.plate === 'chip';
    const companion = key === 'vertical' ? row.horizontal : row.vertical;
    const valuesAreClose = !series.single && Math.abs(Number(props.value) - companion) <= Math.max(Math.abs(Number(props.value)), Math.abs(companion), 1) * .18;
    // O padrão é ficar junto do ponto. Só afastamos a segunda etiqueta quando os dois
    // valores disputam a mesma região; nesse caso, a linha-guia preserva a associação.
    const labelTier = series.single ? index % 4 : 0;
    const yOffset = series.single ? -14 - labelTier * 19 : valuesAreClose && key === 'horizontal' ? -34 : -14;
    const labelY = Math.max(18, props.y + yOffset);
    const label = formatValue(Number(props.value));
    const width = Math.max(34, label.length * 7 + 12);
    const needsLeader = labelTier > 0 || props.y - labelY > 20;
    // JG-07: "tirar o branco do fundo dos períodos que não são os 2Trimestres". O trimestre é
    // identificado pelo seu valor (`quarter[0]`), não pela posição na série. Fora do trimestre de
    // fechamento não há placa: a legibilidade vem do contorno do próprio texto, não de um retângulo.
    if (!emphasized) return <g className="panorama-point-label"><>{needsLeader && <line x1={props.x} y1={props.y - 3} x2={props.x} y2={labelY + 3} stroke={color} strokeWidth={1}/>}<text x={props.x} y={labelY} textAnchor="middle" stroke="#fff" strokeWidth={3} paintOrder="stroke" strokeLinejoin="round">{label}</text></></g>;
    return <g className="panorama-highlight-label"><>{needsLeader && <line x1={props.x} y1={props.y - 3} x2={props.x} y2={labelY + 4} stroke={color} strokeWidth={1}/>}<g transform={`translate(${props.x - width / 2} ${labelY - 13})`}><rect width={width} height={19} fill={color}/><text x={width / 2} y={13} textAnchor="middle" fill={textColor}>{label}</text></g></></g>;
  };

  /**
   * JG-25: "alterar para gráfico em barra, inserir quanto variou de um período para outro".
   * A variação é `atual − anterior` sobre o anterior; o primeiro período e o denominador zero não
   * produzem percentual — devolvem `null` e são impressos como `—`, nunca como infinito ou 0%.
   */
  const renderBarLabel = (props: { index?: number; x?: number; y?: number; width?: number; value?: number }) => {
    const index = props.index ?? -1;
    const row = data[index];
    if (!row || props.x === undefined || props.y === undefined || props.width === undefined || props.value === undefined) return null;
    const previous = data[index - 1];
    const delta = previous ? variation(Number(props.value), previous.vertical) : null;
    const centre = props.x + props.width / 2;
    const emphasized = row.quarter[0] === referenceQuarter;
    // Rótulo compacto: com 17 barras, `R$ 10.574/m²` por barra se sobrepõe ao vizinho. A unidade já
    // está no título e na legenda da lâmina, então a barra carrega só o número.
    return <g className={emphasized ? 'panorama-bar-label is-reference' : 'panorama-bar-label'}>
      <text x={centre} y={Math.max(24, props.y - 16)} textAnchor="middle">{n(Number(props.value))}</text>
      <text x={centre} y={Math.max(36, props.y - 4)} textAnchor="middle" className={delta === null ? 'panorama-bar-delta' : delta >= 0 ? 'panorama-bar-delta panorama-cf-positive' : 'panorama-bar-delta panorama-cf-negative'}>
        {delta === null ? '—' : `${delta >= 0 ? '▲' : '▼'} ${pct(Math.abs(delta))}`}
      </text>
    </g>;
  };

  const years = [...new Set(data.map((item) => year(item.quarter)))];
  const unitLabel = series.unit === 'count' ? ([14, 15].includes(page) ? 'empreendimentos' : 'unidades') : series.unit === 'mi' ? 'milhões' : 'R$/m²';
  return <div className={`panorama-chart ${series.pattern ? 'panorama-pattern-chart' : ''} ${series.single ? 'panorama-single-chart' : ''}`}>
    <div className="panorama-chart-head">
      <div><h2>{series.title}</h2><i/></div>
      <div className="panorama-variation">
        <b>VARIAÇÕES | {series.metric}</b>
        <div className="panorama-variation-grid">
          <span aria-hidden="true"/>
          {comparisons.map(({ previous, current }) => <span key={`${previous.quarter}-${current.quarter}`}>{quarterLabel(previous.quarter)} x {quarterLabel(current.quarter)}</span>)}
          <span>{series.nouns[0]}</span>
          {/* A cor da série identifica a linha do gráfico; ela não pode julgar o sinal. Uma
              variação de −66,7% pintada de verde é o oposto do que a regra semântica manda. */}
          {comparisons.map(({ previous, current }) => { const delta = variation(current.vertical, previous.vertical); const verdict = conditionalFormat('variation', { value: delta }); return <strong className={`panorama-variation-primary ${verdict.className}`} key={`v-${current.quarter}`}>{delta === null ? '—' : `${verdict.symbol} ${pct(Math.abs(delta))}`.trim()}<span className="panorama-sr-only">{verdict.srLabel}</span></strong>; })}
          {!series.single && !hideCompanion && <><span>{series.nouns[1]}</span>{comparisons.map(({ previous, current }) => { const delta = variation(current.horizontal, previous.horizontal); const verdict = conditionalFormat('variation', { value: delta }); return <strong className={`panorama-variation-secondary ${verdict.className}`} key={`h-${current.quarter}`}>{delta === null ? '—' : `${verdict.symbol} ${pct(Math.abs(delta))}`.trim()}<span className="panorama-sr-only">{verdict.srLabel}</span></strong>; })}</>}
        </div>
      </div>
    </div>
    {series.pattern && <div className="panorama-segment-band">RESIDENCIAL VERTICAL</div>}
    {/* A faixa anual soma o que é fluxo (empreendimentos, unidades, VGV) e **pondera** o que é taxa
        (R$/m²). Somar preço por m² dos quatro trimestres produz um número sem significado — era o
        `2022 · R$ 17.173/m²` impresso em destaque, e o portão da matriz proíbe somar preços. */}
    <div className="panorama-annual-strip">{years.map((annualYear) => {
      const rows = data.filter((item) => year(item.quarter) === annualYear);
      const observed = rows.filter((row) => Number.isFinite(row.total));
      const isRate = series.unit === 'sqm';
      const total = observed.reduce((sum, row) => sum + row.total, 0);
      const average = observed.length ? total / observed.length : 0;
      const headline = isRate ? average : total;
      const isClosingYear = annualYear === year(report.scope.endQuarter);
      return <span key={annualYear}>
        <b>{annualYear}{isClosingYear ? '*' : ''}</b>
        {formatValue(headline)}{isRate ? '' : ` ${unitLabel}`}
        <small>{isRate ? 'média do ano' : <>{formatValue(average)} {series.unit === 'count' && [14, 15].includes(page) ? 'Emp.' : series.unit === 'count' ? 'Unid.' : 'Mi.'}/Trimestre</>}</small>
      </span>;
    })}</div>
    <ResponsiveContainer width="100%" height={series.pattern ? '51%' : '62%'}>
      {series.bars
        ? <BarChart data={data} margin={{ left: 22, right: 22, top: 64, bottom: 18 }}>
            <XAxis dataKey="quarter" tickFormatter={quarterLabel} tickLine={false} tickMargin={8} axisLine={{ stroke: '#c9c9c9' }} tick={{ fontSize: 11 }} interval={0} minTickGap={0}/>
            <Tooltip formatter={(value) => formatValue(Number(value))} labelFormatter={(value) => quarterLabel(String(value) as never)}/>
            <Legend verticalAlign="bottom"/>
            <Bar dataKey="vertical" name={series.nouns[0]} fill={series.colors[0]} isAnimationActive={false} label={renderBarLabel}/>
          </BarChart>
        : <LineChart data={data} margin={{ left: 22, right: 22, top: series.single ? 88 : 26, bottom: 18 }}>
            <XAxis dataKey="quarter" tickFormatter={quarterLabel} tickLine={false} tickMargin={8} axisLine={{ stroke: '#c9c9c9' }} tick={{ fontSize: 11 }} interval={0} minTickGap={0} padding={{ left: 12, right: 12 }}/>
            <Tooltip formatter={(value) => formatValue(Number(value))} labelFormatter={(value) => quarterLabel(String(value) as never)}/>
            <Legend verticalAlign="bottom"/>
            <Line type="monotone" dataKey="vertical" name={series.nouns[0]} stroke={series.colors[0]} strokeWidth={4} dot={false} isAnimationActive={false} label={renderPointLabel('vertical', series.colors[0], '#fff')}/>
            {!series.single && !hideCompanion && <Line type="monotone" dataKey="horizontal" name={series.nouns[1]} stroke={series.colors[1]} strokeWidth={4} dot={false} isAnimationActive={false} label={renderPointLabel('horizontal', series.colors[1], series.pattern ? '#fff' : '#080808')}/>}
          </LineChart>}
    </ResponsiveContainer>
    {series.pattern && <div className="panorama-mcmv-strip">{years.slice(-4).map((annualYear) => { const rows = data.filter((item) => year(item.quarter) === annualYear); const economic = rows.reduce((sum, row) => sum + row.vertical, 0); const total = rows.reduce((sum, row) => sum + row.total, 0); return <strong key={annualYear}>MCMV {annualYear}{annualYear === year(report.scope.endQuarter) ? '*' : ''}<span>{total ? pct(economic / total * 100) : '—'}</span></strong>; })}</div>}
    {series.pattern && <p className="panorama-chart-note">OBS.: MCMV = Minha Casa Minha Vida.</p>}
    {hideCompanion && <p className="panorama-chart-note">{report.horizontalSeries.reason}</p>}
  </div>;
}
function comparisonSeries(report: PanoramaReportModel, sales = false) { const metric = sales ? report.sales : { units: { series: report.launches.units }, vgv: { series: report.launches.vgv } }; const quarters = metric.units.series.filter((x: LaunchSeries) => x.quarter[0] === report.scope.endQuarter[0]).slice(-5); return { quarters, rows: [{ label: 'Empreendimentos', series: report.launches.projects, money: false, show: !sales }, { label: 'Unidades', series: metric.units.series, money: false, show: true }, { label: sales ? 'VGV vendido' : 'VGV lançado', series: metric.vgv.series, money: true, show: true }].filter((x) => x.show) }; }
export function annualizeSeries(series: LaunchSeries[]) {
  const annual = new Map<number, { year: number; vertical: number; horizontal: number; total: number }>();
  for (const item of series) {
    const year = Number(item.quarter.slice(2));
    const current = annual.get(year) ?? { year, vertical: 0, horizontal: 0, total: 0 };
    current.vertical += item.vertical ?? 0;
    current.horizontal += item.horizontal ?? 0;
    current.total += item.total ?? 0;
    annual.set(year, current);
  }
  return [...annual.values()].sort((a, b) => a.year - b.year);
}

function FiergsPointValue({ x, y, value, index, data, format, referenceQuarter }: { x?: number; y?: number; value?: number; index?: number; data: LaunchSeries[]; format: (value: number) => string; referenceQuarter: string }) {
  if (x === undefined || y === undefined || value === undefined || index === undefined) return null;
  const label = format(Number(value)); const equivalent = data[index]?.quarter[0] === referenceQuarter;
  if (!equivalent) return <text x={x} y={y - 12} textAnchor="middle" className="panorama-fiergs-point">{label}</text>;
  const width = Math.max(36, label.length * 8 + 14);
  return <g className="panorama-fiergs-point-highlight"><rect x={x - width / 2} y={y - 27} width={width} height={19} rx={2}/><text x={x} y={y - 17} textAnchor="middle">{label}</text></g>;
}

type FiergsComparisonPair = { title: string; leftLabel: string; rightLabel: string; left: number; right: number };
function contextualComparisonPairs(data: LaunchSeries[], endQuarter: string, snapshot = false): FiergsComparisonPair[] {
  const quarter = Number(endQuarter[0]); const currentYear = Number(endQuarter.slice(2)); const previousYear = currentYear - 1;
  const value = (year: number, q: number) => data.find((row) => row.quarter === `${q}T${year}`)?.vertical ?? 0;
  const pairs: FiergsComparisonPair[] = [{ title: `COMPARATIVO ${quarter}º TRIMESTRE`, leftLabel: `${quarter}T/${String(previousYear).slice(-2)}`, rightLabel: `${quarter}T/${String(currentYear).slice(-2)}`, left: value(previousYear, quarter), right: value(currentYear, quarter) }];
  if (snapshot || quarter === 1) return pairs;
  const accumulated = (year: number) => data.filter((row) => Number(row.quarter.slice(2)) === year && Number(row.quarter[0]) <= quarter).reduce((sum, row) => sum + row.vertical, 0);
  const period = quarter === 2 ? '1S' : quarter === 3 ? '9M' : 'ANO';
  pairs.push({ title: `COMPARATIVO ${period}`, leftLabel: `${period}/${String(previousYear).slice(-2)}`, rightLabel: `${period}/${String(currentYear).slice(-2)}`, left: accumulated(previousYear), right: accumulated(currentYear) });
  return pairs;
}
function FiergsContextComparisons({ pairs, format }: { pairs: FiergsComparisonPair[]; format: (value: number) => string }) {
  return <aside className="panorama-fiergs-context-comparisons">{pairs.map((pair) => { const delta = variation(pair.right, pair.left); return <section key={pair.title}><h3>{pair.title}</h3><div><span><b>{format(pair.left)}</b><small>{pair.leftLabel}</small></span><em>{delta === null ? '—' : `${delta >= 0 ? '+' : ''}${pct(delta)}`}</em><span><b>{format(pair.right)}</b><small>{pair.rightLabel}</small></span></div></section>; })}</aside>;
}

function FiergsQuarterlySlide({ report, officialSlide }: { report: PanoramaReportModel; officialSlide: number }) {
  const rolling = [11, 14, 22].includes(officialSlide);
  const base = [9, 11].includes(officialSlide) ? report.launches.projects : [20, 22].includes(officialSlide) ? report.launches.vgv : report.launches.units;
  const rollingData = base
    .map((row, index) => ({ ...row, vertical: base.slice(Math.max(0, index - 3), index + 1).reduce((sum, item) => sum + item.vertical, 0) }))
    .filter((_, index) => index >= 3);
  const config = [9, 11].includes(officialSlide)
    ? { title: 'EMPREENDIMENTOS VERTICAIS LANÇADOS', data: rolling ? rollingData : base, unit: 'empreendimentos' }
    : [20, 22].includes(officialSlide)
      ? { title: 'VGV LANÇADO VERTICAL', data: rolling ? rollingData : base, unit: 'R$ milhões' }
      : { title: 'UNIDADES VERTICAIS LANÇADAS', data: rolling ? rollingData : base, unit: 'unidades' };
  const data = config.data;
  const annual = (rolling
    ? data.filter((row) => row.quarter.startsWith('4T')).map((row) => ({ year: Number(row.quarter.slice(2)), vertical: row.vertical, horizontal: 0, total: row.vertical }))
    : annualizeSeries(data)).slice(-5);
  const annualComparisons = annual.slice(1).map((current, index) => ({ from: annual[index], to: current, delta: variation(current.vertical, annual[index].vertical) }));
  const closingYear = Number(report.scope.endQuarter.slice(2));
  const closingRows = data.filter((row) => Number(row.quarter.slice(2)) === closingYear);
  const firstSemester = rolling ? annual.at(-2)?.vertical ?? 0 : closingRows.filter((row) => ['1T', '2T'].includes(row.quarter.slice(0, 2))).reduce((sum, row) => sum + row.vertical, 0);
  const secondSemester = rolling ? annual.at(-1)?.vertical ?? 0 : closingRows.filter((row) => ['3T', '4T'].includes(row.quarter.slice(0, 2))).reduce((sum, row) => sum + row.vertical, 0);
  const semesterDelta = variation(secondSemester, firstSemester);
  const format = (value: number) => officialSlide === 20 ? decimal(value) : n(value);
  const visibleTicks = visibleQuarterTickIndexes(data);
  const visibleLabels = visiblePointLabelIndexes(data);
  const comparisons: FiergsComparisonPair[] = rolling
    ? [{ title: 'FECHAMENTOS ANUAIS', leftLabel: String(annual.at(-2)?.year ?? 'Anterior'), rightLabel: String(annual.at(-1)?.year ?? closingYear), left: firstSemester, right: secondSemester }]
    : contextualComparisonPairs(base, report.scope.endQuarter);
  return <div className="panorama-fiergs-quarterly">
    <header><h2>{config.title}<span>{rolling ? 'ACUMULADO 12 MESES' : 'POR TRIMESTRE'}</span></h2><div><b>VARIAÇÕES ANUAIS</b><section>{annualComparisons.map(({ from, to, delta }) => <span key={to.year}><small>{from.year} × {to.year}</small><strong>{delta === null ? '—' : `${delta >= 0 ? '+' : ''}${pct(delta)}`}</strong></span>)}</section></div></header>
    <main><div className="panorama-fiergs-quarterly-series"><ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ left: 24, right: 28, top: 42, bottom: 24 }}><XAxis dataKey="quarter" tickFormatter={(value, index) => visibleTicks.has(index) ? compactQuarterLabel(String(value)) : ''} tickLine={false} tickMargin={9} axisLine={{ stroke: '#b8b8b8' }} interval={0} minTickGap={0}/><Tooltip formatter={(value) => format(Number(value))} labelFormatter={(value) => quarterLabel(String(value) as LaunchSeries['quarter'])}/><Line type="monotone" dataKey="vertical" name="RM de Porto Alegre" stroke="#5d7737" strokeWidth={4} dot={{ r: 2.5, fill: '#5d7737' }} isAnimationActive={false} label={(props) => visibleLabels.has(Number(props.index)) ? <FiergsPointValue {...props} data={data} format={format} referenceQuarter={report.scope.endQuarter[0]}/> : null}/></LineChart></ResponsiveContainer><p>RM de Porto Alegre · {config.unit}</p></div><FiergsContextComparisons pairs={comparisons} format={format}/></main>
    <footer>FONTE: BRAIN INTELIGÊNCIA ESTRATÉGICA · fotografia atual da API GeoBrain</footer>
  </div>;
}

function FiergsLaunchCitySlide({ report }: { report: PanoramaReportModel }) {
  const rows = report.scope.cities.map((city) => {
    const projects = report.cube.projects.filter((project) => project.segment === 'Vertical' && project.city === city && project.releaseQuarter === report.scope.endQuarter);
    return { city, units: projects.reduce((sum, project) => sum + (project.launchedUnits ?? 0), 0), projects };
  }).sort((a, b) => b.units - a.units);
  const total = rows.reduce((sum, row) => sum + row.units, 0);
  const neighborhoods = rows.flatMap((row) => {
    const grouped = new Map<string, number>();
    row.projects.forEach((project) => grouped.set(project.neighborhood || 'Bairro não informado', (grouped.get(project.neighborhood || 'Bairro não informado') ?? 0) + (project.launchedUnits ?? 0)));
    return [...grouped].map(([neighborhood, units]) => ({ label: `${neighborhood} — ${row.city}`, units }));
  }).sort((a, b) => b.units - a.units).slice(0, 7);
  const bars = (items: { label: string; units: number }[]) => <div className="panorama-fiergs-share-bars">{items.map((item) => <div key={item.label}><span>{item.label}</span><i><b style={{ width: `${total ? item.units / total * 100 : 0}%` }}/></i><strong>{total ? pct(item.units / total * 100) : '—'}</strong></div>)}</div>;
  return <div className="panorama-fiergs-city-share"><h2>UNIDADES VERTICAIS LANÇADAS<span>POR BAIRRO E CIDADE</span></h2><main><section>{bars(neighborhoods)}</section><section>{bars(rows.map((row) => ({ label: row.city, units: row.units })))}</section></main><footer>Total do trimestre: {n(total)} unidades · Fonte: cubo granular GeoBrain</footer></div>;
}

type FiergsDistributionRow = { label: string; value: number };
function FiergsDistributionSlide({ title, subtitle, rows, unit }: { title: string; subtitle: string; rows: FiergsDistributionRow[]; unit: string }) {
  const visible = rows.filter((row) => row.value > 0).sort((a, b) => b.value - a.value);
  const total = visible.reduce((sum, row) => sum + row.value, 0); const max = Math.max(1, ...visible.map((row) => row.value));
  return <div className="panorama-fiergs-distribution"><header><h2>{title}<span>{subtitle}</span></h2><strong>{n(total)}<small>{unit}</small></strong></header>
    {visible.length ? <main>{visible.slice(0, 9).map((row, index) => <div key={row.label}><span>{row.label}</span><i><b style={{ width: `${row.value / max * 100}%` }}/></i><strong>{n(row.value)}</strong><small>{pct(row.value / total * 100)}</small>{index < 3 && <em>{index + 1}º</em>}</div>)}</main> : <div className="panorama-coverage-notice"><strong>Dimensão sem observações</strong><p>A fonte correta foi consultada, mas não retornou valores para esta distribuição no período.</p></div>}
    <footer>FONTE: BRAIN INTELIGÊNCIA ESTRATÉGICA · fotografia atual da API GeoBrain</footer></div>;
}
function groupedValues(values: FiergsDistributionRow[]) { const groups = new Map<string, number>(); values.forEach(({ label, value }) => groups.set(label, (groups.get(label) ?? 0) + value)); return [...groups].map(([label, value]) => ({ label, value })); }
function launchDistribution(report: PanoramaReportModel, dimension: 'standard-projects' | 'standard-units' | 'typology-units' | 'standard-vgv'): FiergsDistributionRow[] {
  const projects = report.cube.projects.filter((project) => project.segment === 'Vertical' && project.releaseQuarter === report.scope.endQuarter);
  if (dimension === 'typology-units') return groupedValues(projects.flatMap((project) => project.typologies.map((typology) => ({ label: typology.typology, value: typology.launchedUnits ?? 0 }))));
  return groupedValues(projects.map((project) => ({ label: project.standard, value: dimension === 'standard-projects' ? 1 : dimension === 'standard-vgv' ? project.launchedVgvMillions ?? 0 : project.launchedUnits ?? 0 })));
}
function temporalDistribution(block: ReportMarketBlock): FiergsDistributionRow[] { return block.groupSeries.map((group) => ({ label: group.label, value: group.series.find((row) => row.quarter === block.series.at(-1)?.quarter)?.vertical ?? group.series.at(-1)?.vertical ?? 0 })); }

function rollingSeries(data: LaunchSeries[]): LaunchSeries[] {
  return data.map((row, index) => {
    const window = data.slice(Math.max(0, index - 3), index + 1);
    return { ...row, vertical: window.reduce((sum, item) => sum + item.vertical, 0), horizontal: window.reduce((sum, item) => sum + item.horizontal, 0), total: window.reduce((sum, item) => sum + item.total, 0) };
  }).filter((_, index) => index >= 3);
}

function FiergsPatternTemporalSlide({ report, kind, rolling = false }: { report: PanoramaReportModel; kind: 'launches' | 'sales'; rolling?: boolean }) {
  const raw = kind === 'launches' ? launchPatternSeries(report.launches.unitStandards) : marketPatternSeries(report.sales.units);
  const data = rolling ? rollingSeries(raw) : raw; const ticks = visibleQuarterTickIndexes(data); const closing = report.scope.endQuarter[0];
  const annual = data.filter((row) => row.quarter.startsWith(closing)).slice(-5);
  const share = annual.map((row) => ({ year: row.quarter.slice(2), value: row.total ? row.vertical / row.total * 100 : 0 }));
  const point = (key: 'vertical' | 'horizontal', color: string, dy: number) => (props: { x?: number; y?: number; value?: number; index?: number }) => {
    if (props.x === undefined || props.y === undefined || props.value === undefined || props.index === undefined) return null;
    const equivalent = data[props.index]?.quarter[0] === closing; const label = n(props.value);
    return <text x={props.x} y={props.y + dy} textAnchor="middle" className={`panorama-fiergs-pattern-point ${equivalent ? 'is-reference' : ''}`} style={{ fill: equivalent ? '#fff' : color, stroke: equivalent ? color : '#fff' }}>{label}</text>;
  };
  return <div className="panorama-fiergs-pattern"><header><h2>UNIDADES VERTICAIS {kind === 'launches' ? 'LANÇADAS' : 'VENDIDAS'}<span>{rolling ? 'MCMV · ACUMULADO 12 MESES' : 'MCMV · POR TRIMESTRE'}</span></h2><div>{share.map((item) => <span key={item.year}><small>{item.year}</small><strong>{pct(item.value)}</strong></span>)}</div></header>
    <main><ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ left: 28, right: 28, top: 42, bottom: 26 }}><XAxis dataKey="quarter" tickFormatter={(value, index) => ticks.has(index) ? compactQuarterLabel(String(value)) : ''} interval={0} tickLine={false}/><Tooltip/><Legend/><Line type="monotone" dataKey="vertical" name="MCMV / Econômico" stroke="#c62026" strokeWidth={3.5} dot={{ r: 2.5 }} isAnimationActive={false} label={point('vertical', '#a50f16', -12)}/><Line type="monotone" dataKey="horizontal" name="Demais padrões" stroke="#7b8178" strokeWidth={3.5} dot={{ r: 2.5 }} isAnimationActive={false} label={point('horizontal', '#555b53', 20)}/></LineChart></ResponsiveContainer></main>
    <footer>Participação MCMV destacada nos trimestres equivalentes · Fonte: GeoBrain</footer></div>;
}

function FiergsSalesCitySlide({ report }: { report: PanoramaReportModel }) {
  const rows = report.cityComparisons.sales.filter((row) => row.liquidSales !== null).map((row) => ({ label: row.city, value: row.liquidSales ?? 0 }));
  return <FiergsDistributionSlide title="UNIDADES VERTICAIS VENDIDAS" subtitle={`POR CIDADE · ${quarterLabel(report.scope.endQuarter)}`} rows={rows} unit="unidades"/>;
}

function FiergsDormitoryPriceSlide({ report, bedroom }: { report: PanoramaReportModel; bedroom: number }) {
  const matcher = bedroom === 4 ? /4|mais/i : new RegExp(`(^|\\D)${bedroom}(\\D|$)`);
  const group = report.prices.meterByTypology.groupSeries.find((item) => matcher.test(item.label));
  if (!group?.series.length) return <CoveragePage title={`EVOLUÇÃO DO R$/M² · ${bedroom === 4 ? '4 OU MAIS' : bedroom} DORMITÓRIOS`} detail="A série temporal por tipologia não retornou observações para este número de dormitórios."/>;
  const data = group.series.map((row) => ({ ...row, horizontal: 0, total: row.vertical })); const ticks = visibleQuarterTickIndexes(data); const labels = visiblePointLabelIndexes(data);
  return <div className="panorama-fiergs-dormitory"><header><h2>EVOLUÇÃO DO R$/M²<span>{bedroom === 4 ? '4 OU MAIS DORMITÓRIOS' : `${bedroom} DORMITÓRIO${bedroom > 1 ? 'S' : ''}`}</span></h2></header><main><ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ left: 38, right: 38, top: 48, bottom: 28 }}><XAxis dataKey="quarter" tickFormatter={(value, index) => ticks.has(index) ? compactQuarterLabel(String(value)) : ''} interval={0} tickLine={false}/><Tooltip formatter={(value) => `R$ ${n(Number(value))}/m²`}/><Line type="monotone" dataKey="vertical" name={group.label} stroke="#5d7737" strokeWidth={4} dot={{ r: 3 }} isAnimationActive={false} label={(props) => labels.has(Number(props.index)) ? <FiergsPointValue {...props} data={data} format={(value) => n(value)} referenceQuarter={report.scope.endQuarter[0]}/> : null}/></LineChart></ResponsiveContainer></main><footer>R$/m² privativo médio · Fonte: GeoBrain</footer></div>;
}

function FiergsMarketQuarterlySlide({ report, officialSlide }: { report: PanoramaReportModel; officialSlide: number }) {
  const rolling = [26, 28, 33].includes(officialSlide); const stock = officialSlide === 35; const vgv = [32, 33].includes(officialSlide); const ivv = officialSlide === 39;
  const block = ivv ? report.ivv : stock ? report.stock.units : vgv ? report.sales.vgv : report.sales.units;
  if (block.dataStatus === 'unavailable') return <CoveragePage title={stock ? 'OFERTA FINAL VERTICAL POR TRIMESTRE' : vgv ? 'VGV VENDIDO VERTICAL' : 'UNIDADES VERTICAIS VENDIDAS'} detail="A API não disponibilizou a série temporal correta para este recorte; a página não foi preenchida com zeros nem com outra métrica."/>;
  const base = block.series.map((row) => ({ ...row, horizontal: 0, total: row.vertical }));
  const data = rolling ? base.map((row, index) => ({ ...row, vertical: base.slice(Math.max(0, index - 3), index + 1).reduce((sum, item) => sum + item.vertical, 0) })).filter((_, index) => index >= 3) : base;
  const annual = (rolling || stock
    ? data.filter((row, index) => row.quarter.startsWith('4T') || (index === data.length - 1 && !data.some((candidate) => candidate.quarter.startsWith('4T') && candidate.quarter.slice(2) === row.quarter.slice(2)))).map((row) => ({ year: Number(row.quarter.slice(2)), vertical: row.vertical, horizontal: 0, total: row.vertical }))
    : annualizeSeries(data)).slice(-5);
  const annualComparisons = annual.slice(1).map((current, index) => ({ from: annual[index], to: current, delta: variation(current.vertical, annual[index].vertical) }));
  const visibleTicks = visibleQuarterTickIndexes(data); const visibleLabels = visiblePointLabelIndexes(data); const closingYear = Number(report.scope.endQuarter.slice(2)); const closingRows = data.filter((row) => Number(row.quarter.slice(2)) === closingYear);
  const left = rolling ? annual.at(-2)?.vertical ?? 0 : stock ? closingRows.find((row) => row.quarter.startsWith('2T'))?.vertical ?? closingRows[0]?.vertical ?? 0 : closingRows.filter((row) => ['1T', '2T'].includes(row.quarter.slice(0, 2))).reduce((sum, row) => sum + row.vertical, 0);
  const right = rolling ? annual.at(-1)?.vertical ?? 0 : stock ? closingRows.find((row) => row.quarter.startsWith('4T'))?.vertical ?? closingRows.at(-1)?.vertical ?? 0 : closingRows.filter((row) => ['3T', '4T'].includes(row.quarter.slice(0, 2))).reduce((sum, row) => sum + row.vertical, 0);
  const delta = variation(right, left); const format = ivv ? (value: number) => pct(value) : vgv ? decimal : n; const title = ivv ? 'IVV VERTICAL' : stock ? 'OFERTA FINAL VERTICAL' : vgv ? 'VGV VENDIDO VERTICAL' : 'UNIDADES VERTICAIS VENDIDAS';
  const comparisons: FiergsComparisonPair[] = rolling
    ? [{ title: 'FECHAMENTOS ANUAIS', leftLabel: String(annual.at(-2)?.year ?? 'Anterior'), rightLabel: String(annual.at(-1)?.year ?? closingYear), left, right }]
    : contextualComparisonPairs(base, report.scope.endQuarter, stock || ivv);
  return <div className="panorama-fiergs-quarterly"><header><h2>{title}<span>{rolling ? 'ACUMULADO 12 MESES' : 'POR TRIMESTRE'}</span></h2><div><b>VARIAÇÕES ANUAIS</b><section>{annualComparisons.map(({ from, to, delta: annualDelta }) => <span key={to.year}><small>{from.year} × {to.year}</small><strong>{annualDelta === null ? '—' : `${annualDelta >= 0 ? '+' : ''}${pct(annualDelta)}`}</strong></span>)}</section></div></header>
    <main><div className="panorama-fiergs-quarterly-series"><ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ left: 24, right: 28, top: 42, bottom: 24 }}><XAxis dataKey="quarter" tickFormatter={(value, index) => visibleTicks.has(index) ? compactQuarterLabel(String(value)) : ''} tickLine={false} tickMargin={9} axisLine={{ stroke: '#b8b8b8' }} interval={0}/><Tooltip formatter={(value) => format(Number(value))}/><Line type="monotone" dataKey="vertical" name="RM de Porto Alegre" stroke="#5d7737" strokeWidth={4} dot={{ r: 2.5, fill: '#5d7737' }} isAnimationActive={false} label={(props) => visibleLabels.has(Number(props.index)) ? <FiergsPointValue {...props} data={data} format={format} referenceQuarter={report.scope.endQuarter[0]}/> : null}/></LineChart></ResponsiveContainer><p>RM de Porto Alegre · {ivv ? '%' : vgv ? 'R$ milhões' : 'unidades'}</p></div><FiergsContextComparisons pairs={comparisons} format={format}/></main><footer>FONTE: BRAIN INTELIGÊNCIA ESTRATÉGICA · série temporal GeoBrain</footer></div>;
}

function fiergsBackground(def: ReportPageDefinition): string | undefined {
  if (def.visualFamily === 'divider') return FIERGS_SECTION_DIVIDER;
  if (def.fiergsOfficialSlide) return FIERGS_INSTITUTIONAL_SLIDES[def.fiergsOfficialSlide];
  const referenceSlide = def.referenceSlide;
  const mapping: Record<number, number> = { 2: 1, 3: 3, 7: 4, 59: 72, 60: 73, 61: 74, 62: 75 };
  return FIERGS_INSTITUTIONAL_SLIDES[mapping[referenceSlide]];
}
function ComparisonTable({ report, sales = false, annual = false }: { report: PanoramaReportModel; sales?: boolean; annual?: boolean }) {
  const temporalBlock = sales ? report.sales.units : null;
  if (temporalBlock?.dataStatus === 'unavailable') {
    return <CoveragePage title={annual ? 'VENDAS | POR ANO' : 'VENDAS | POR TRIMESTRE'} detail="A API não disponibilizou a série temporal de vendas para este recorte. A tabela foi preservada como indisponível para não apresentar zeros como se fossem resultados observados."/>;
  }
  const { quarters, rows } = comparisonSeries(report, sales);
  const annualSales = sales ? { units: annualizeSeries(report.sales.units.series), vgv: annualizeSeries(report.sales.vgv.series) } : null;
  const periods = annual ? (sales ? annualSales!.units : report.launches.annual).slice(-4).map((item) => String(item.year)) : quarters.map((item: LaunchSeries) => item.quarter);
  const comparisonPairs = [[periods.at(-3), periods.at(-2)], [periods.at(-2), periods.at(-1)]] as const;
  const get = (row: typeof rows[number], period: string, type: 'vertical' | 'horizontal' | 'total') => {
    if (annual) {
      if (sales) {
        const source = row.label === 'Unidades' ? annualSales!.units : annualSales!.vgv;
        return source.find((annualItem) => String(annualItem.year) === period)?.[type] ?? 0;
      }
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
        // JG-13 a JG-18: o contrato municipal de vendas agrega todo o horizontal. Quando existe
        // Condomínio de Casas aceito, ele não sabe separá-lo dos loteamentos — então a linha vira
        // indisponível em vez de publicar venda de outro universo com o rótulo do universo Secovi.
        const suppressed = sales && type !== 'vertical' && !report.horizontalSeries.attributable;
        return <tr key={`${row.label}-${type}`} className={type === 'total' ? 'panorama-total-row' : ''}>
          {rowIndex === 0 && <th rowSpan={3} scope="rowgroup" className="panorama-group-cell">{groupLabel(row.label)}</th>}
          {/* JG-05: o rótulo do segmento é a mesma função nas três linhas e por isso recebe o mesmo
              tratamento. O cinza só aparecia no Horizontal e no Total porque o `rowspan` do grupo
              deslocava o `td:first-child` — era artefato de marcação, não decisão editorial. */}
          <td className="panorama-segment-cell">{type === 'vertical' ? 'Residencial Vertical' : type === 'horizontal' ? horizontalLabelForEntity(report.scope.entity) : 'Total Mercado'}</td>
          {values.map((value, index) => <td key={index}>{suppressed ? '—' : row.money ? decimal(value) : n(value)}</td>)}
          {comparisonPairs.map(([from, to]) => {
            if (!from || !to) return null;
            const delta = suppressed ? null : variation(get(row, to, type), get(row, from, type));
            // JG-05: colunas de variação usam a mesma regra semântica das demais formatações
            // condicionais do relatório — sinal e símbolo, não só cor.
            const verdict = conditionalFormat('variation', { value: delta, max: 100, unavailable: suppressed });
            return <td className={`panorama-variation-cell ${type === 'total' ? 'panorama-cf-neutral' : verdict.className}`} style={{ '--panorama-change-size': `${verdict.intensity}%` } as React.CSSProperties} key={`${from}-${to}`}>
              {type !== 'total' && delta !== null && <span className="panorama-change-bar"/>}
              <strong>{delta === null ? '—' : `${verdict.symbol} ${pct(Math.abs(delta))}`.trim()}</strong>
              <span className="panorama-sr-only">{verdict.srLabel}</span>
            </td>;
          })}
        </tr>;
      }))}</tbody>
    </table>
    {sales && !report.horizontalSeries.attributable && <p className="panorama-coverage-caption">{report.horizontalSeries.reason}</p>}
  </div>;
}
function CoveragePage({ title, detail }: { title: string; detail: string }) { return <div className="panorama-table-page"><h2>{title}</h2><i/><div className="panorama-coverage-notice"><strong>Dimensão em validação</strong><p>{detail}</p><span>O desenho desta página está reservado para o contrato correto; nenhum indicador de outro bloco foi reutilizado.</span></div></div>; }
function MarketTable({ title, block, groupTitle = 'Grupo' }: { title: string; block: ReportMarketBlock; groupTitle?: string }) { return <div className="panorama-table-page"><div className="flex items-start justify-between"><div><h2>{title}</h2><i/></div></div>{block.byGroup.length ? <table><thead><tr><th>{groupTitle}</th><th>Vertical</th><th>Horizontal</th><th>Total</th></tr></thead><tbody>{block.byGroup.slice(0, 9).map((row) => <tr key={row.label}><td>{row.label}</td><td>{n(row.vertical)}</td><td>{n(row.horizontal)}</td><td>{n(row.total)}</td></tr>)}</tbody></table> : <p className="panorama-no-data">A fonte foi consultada, mas não retornou linhas comparáveis neste recorte.</p>}<p className="panorama-formula">Fonte: {block.source} · {block.formula}</p></div>; }
function ParticipationPage({ title, block }: { title: string; block: ReportMarketBlock }) { const total = block.byGroup.reduce((sum, row) => sum + row.total, 0); return <div className="panorama-table-page"><h2>{title}</h2><i/><div className="panorama-participation-list">{block.byGroup.length ? block.byGroup.slice(0, 8).map((row) => <div key={row.label}><div><b>{row.label}</b><span>{total ? pct((row.total / total) * 100) : '—'}</span></div><div className="panorama-participation-track"><span style={{ width: `${total ? (row.total / total) * 100 : 0}%` }}/></div></div>) : <p className="panorama-no-data">A API não retornou grupos comparáveis neste recorte.</p>}</div></div>; }
function SummaryMatrix({ title, block }: { title: string; block: ReportMarketBlock }) { return <div className="panorama-table-page"><h2>{title}</h2><i/><div className="panorama-summary-matrix">{['Vertical','Horizontal','Mercado total'].map((label, index) => { const value = index === 0 ? block.series.at(-1)?.vertical ?? 0 : index === 1 ? block.series.at(-1)?.horizontal ?? 0 : block.series.at(-1)?.total ?? 0; return <div key={label}><span>{label}</span><strong>{n(value)}</strong><small>{block.unit === 'brl_millions' ? 'R$ milhões' : 'unidades / indicador'}</small></div>; })}</div><p className="panorama-formula">Fonte: {block.source} · {block.formula}</p></div>; }
function dataPage(page: number, report: PanoramaReportModel) {
  if ([12, 13].includes(page)) return <ComparisonTable report={report} annual={page === 13}/>;
  if ([21, 22].includes(page)) return <ComparisonTable report={report} sales annual={page === 22}/>;
  if ([14, 15, 16, 17, 18, 19, 23, 24, 25, 26, 40].includes(page)) return <TimeChart page={page} report={report}/>;
  if (page === 27) return <AreaIvvSlide report={report}/>;
  if (page === 29) return <MarketSummarySlide report={report}/>;
  if (page === 31) return <OfferTableSlide report={report} dimension="pattern"/>;
  if (page === 32) return <OfferChartSlide report={report} dimension="pattern"/>;
  if (page === 33) return <CohortTableSlide report={report}/>;
  if (page === 34) return <OfferTableSlide report={report} dimension="typology"/>;
  if (page === 35) return <OfferChartSlide report={report} dimension="typology"/>;
  if (page === 36) return <PriceTableSlide report={report} dimension="typology"/>;
  if (page === 37) return <PriceChartSlide report={report} dimension="typology"/>;
  if (page === 38) return <PriceTableSlide report={report} dimension="pattern"/>;
  if (page === 39) return <PriceChartSlide report={report} dimension="pattern"/>;
  if (page === 41) return <CohortMatrixSlide report={report}/>;
  if (page === 42) return <CohortMatrixSlide report={report} participation/>;
  if (page === 43) return <MaturitySlide report={report} dimension="pattern"/>;
  if (page === 44) return <MaturitySlide report={report} dimension="pattern" participation/>;
  if (page === 45) return <MaturitySlide report={report} dimension="typology"/>;
  if (page === 46) return <MaturitySlide report={report} dimension="typology" participation/>;
  if (page === 48) return <CohortTableSlide report={report} segment="horizontal"/>;
  if (page === 49) return <PriceTableSlide report={report} dimension="pattern" horizontal/>;
  if (page === 51) return <VgvSlide report={report}/>;
  return null;
}
function CityComparisonPage({ kind, report }: { kind: NonNullable<ReportPageDefinition['cityComparison']>; report: PanoramaReportModel }) {
  if (kind === 'sales') return <div className="panorama-table-page panorama-city-comparison"><h2>UNIDADES VENDIDAS POR CIDADE <span>| {quarterLabel(report.scope.endQuarter)}</span></h2><table><thead><tr><th>Municípios</th><th>Vendas líquidas</th></tr></thead><tbody>{report.cityComparisons.sales.map((row) => <tr key={row.city}><td>{row.city}</td><td>{row.liquidSales === null ? '—' : n(row.liquidSales)}</td></tr>)}<tr className="panorama-total-row"><td>Total</td><td>{n(report.cityComparisons.sales.reduce((sum, row) => sum + (row.liquidSales ?? 0), 0))}</td></tr></tbody></table></div>;
  if (kind === 'market') {
    const rows = report.cityComparisons.market;
    const launched = rows.reduce((sum, row) => sum + (row.launchedUnits ?? 0), 0);
    const final = rows.reduce((sum, row) => sum + (row.finalUnits ?? 0), 0);
    return <div className="panorama-table-page panorama-city-comparison"><h2>ANÁLISE GERAL DO MERCADO</h2><table><thead><tr><th>Tipo do imóvel</th><th>Empreend.</th><th>Oferta lançada</th><th>Oferta final</th><th>Disponibilidade s/ O.L.</th></tr></thead><tbody>{rows.map((row) => <tr key={`${row.city}-${row.segment}`}><td>Total Mercado Residencial {row.segment === 'Vertical' ? 'Vertical' : 'Horizontal'} — {row.city}</td><td>{n(row.projects)}</td><td>{row.launchedUnits === null ? '—' : n(row.launchedUnits)}</td><td>{row.finalUnits === null ? '—' : n(row.finalUnits)}</td><td>{pct(row.availability)}</td></tr>)}<tr className="panorama-total-row"><td>Total Mercado</td><td>{n(rows.reduce((sum, row) => sum + row.projects, 0))}</td><td>{n(launched)}</td><td>{n(final)}</td><td>{launched ? pct(final / launched * 100) : '—'}</td></tr></tbody></table></div>;
  }
  return <div className="panorama-table-page panorama-city-comparison"><h2>DISPONIBILIDADE RESIDENCIAL VERTICAL POR PADRÃO</h2><table><thead><tr><th>Padrão</th>{report.cityComparisons.sales.map((row) => <th key={row.city}>{row.city}</th>)}</tr></thead><tbody>{report.cityComparisons.availabilityByStandard.map((row) => <tr key={row.standard}><td>{row.standard}</td>{report.cityComparisons.sales.map(({ city }) => <td key={city}>{pct(row.values.find((value) => value.city === city)?.availability ?? null)}</td>)}</tr>)}</tbody></table></div>;
}
function Content({ def, report }: { def: ReportPageDefinition; report: PanoramaReportModel }) {
  const cityLabel = scopeCityLabel(report.scope); const title = def.title.replace('{cidade}', cityLabel); const p = def.contentReferenceSlide ?? def.referenceSlide;
  const official = def.fiergsOfficialSlide;
  if (official === 2) return <FiergsStudyCover report={report}/>;
  if (official === 5) return <Corporate page={8} report={report}/>;
  if (official === 6) return <V2Summary report={report}/>;
  if (official === 7) return <FiergsTerritorialCover report={report}/>;
  if (official && [9, 11, 12, 14, 20, 22].includes(official)) return <FiergsQuarterlySlide report={report} officialSlide={official}/>;
  if (official === 10) return <FiergsDistributionSlide title="EMPREENDIMENTOS VERTICAIS LANÇADOS" subtitle="POR PADRÃO" rows={launchDistribution(report, 'standard-projects')} unit="empreendimentos"/>;
  if (official === 13 || official === 18) return <FiergsDistributionSlide title="UNIDADES VERTICAIS LANÇADAS" subtitle="POR PADRÃO" rows={launchDistribution(report, 'standard-units')} unit="unidades"/>;
  if (official === 15) return <FiergsPatternTemporalSlide report={report} kind="launches"/>;
  if (official === 16) return <FiergsPatternTemporalSlide report={report} kind="launches" rolling/>;
  if (official === 17) return <FiergsDistributionSlide title="UNIDADES VERTICAIS LANÇADAS" subtitle="POR TIPOLOGIA" rows={launchDistribution(report, 'typology-units')} unit="unidades"/>;
  if (official === 19) return <FiergsLaunchCitySlide report={report}/>;
  if (official === 21) return <FiergsDistributionSlide title="VGV LANÇADO VERTICAL" subtitle="POR PADRÃO" rows={launchDistribution(report, 'standard-vgv')} unit="R$ milhões"/>;
  if (official && [24, 26, 32, 33, 35, 39].includes(official)) return <FiergsMarketQuarterlySlide report={report} officialSlide={official}/>;
  if (official === 27) return <FiergsPatternTemporalSlide report={report} kind="sales"/>;
  if (official === 28) return <FiergsPatternTemporalSlide report={report} kind="sales" rolling/>;
  if (official === 25 || official === 30) return <FiergsDistributionSlide title="UNIDADES VERTICAIS VENDIDAS" subtitle="POR PADRÃO" rows={temporalDistribution(report.sales.units)} unit="unidades"/>;
  if (official === 29) return <FiergsDistributionSlide title="UNIDADES VERTICAIS VENDIDAS" subtitle="POR TIPOLOGIA" rows={temporalDistribution(report.sales.unitsByTypology)} unit="unidades"/>;
  if (official === 31) return <FiergsSalesCitySlide report={report}/>;
  if (official === 36) return <OfferTableSlide report={report} dimension="typology"/>;
  if (official === 37) return <OfferTableSlide report={report} dimension="pattern"/>;
  if (official && [44, 45, 46, 47].includes(official)) return <FiergsDormitoryPriceSlide report={report} bedroom={official - 43}/>;
  if (official === 71) return <TeamSlide report={report}/>;
  if (official && [1, 3, 4, 72, 73, 74, 75].includes(official)) return <div aria-hidden="true"/>;
  if (official && def.visualFamily === 'divider') return <V2Divider title={title}/>;
  if (def.fiergsSlide === 'city-scope') return <FiergsCityScope report={report}/>;
  if (def.fiergsSlide === 'horizontal-offer-products') return <FiergsHorizontalOfferSlide report={report}/>;
  if (def.fiergsSlide === 'horizontal-price-range') return <FiergsHorizontalPriceRangeSlide report={report}/>;
  if (def.cityComparison) return <CityComparisonPage kind={def.cityComparison} report={report}/>;
  if (p === 2) return <CityCover report={report}/>;
  if (p === 5) return <V2Summary report={report}/>;
  if ([6,9,11,20,28,30,47,50,52,55,57].includes(p)) return <V2Divider title={title}/>;
  if (p === 58) return <TeamSlide report={report}/>;
  if (p === 59) return <ConsultantClosing report={report}/>;
  if (p === 56 || def.mapMode) return <LocationSlide report={report} mode={def.mapMode}/>;
  if (p >= 60) return <div aria-hidden="true"/>;
  // A V2 não usa lâminas legadas com textos/cidades congelados nem o rodapé da V1.
  if ([3,7,8,10].includes(p)) return <Corporate page={p} report={report}/>;
  if (p === 53 || p === 54) return <NarrativeSlide report={report} continuation={p === 54}/>;
  return dataPage(p, report) ?? <CoveragePage title={title.toUpperCase()} detail="A posição editorial está preservada no livro FIERGS. O componente específico será concluído sem reutilizar uma métrica incompatível do modelo Secovi."/>;
}
function SafeSheet({ def, report }: { def: ReportPageDefinition; report: PanoramaReportModel }) {
  const fallback = <Sheet def={def} report={report}><div className="panorama-page-unavailable"><h2>PÁGINA INDISPONÍVEL</h2><i/><p>Esta página não pôde ser montada. As demais páginas do relatório continuam disponíveis.</p></div></Sheet>;
  return <ReportPageBoundary page={def.page} fallback={fallback}><Sheet def={def} report={report}><Content def={def} report={report}/></Sheet></ReportPageBoundary>;
}
/**
 * As lâminas montadas fora da tela — é sobre elas que a rasterização acontece. Fica isolado
 * porque o host de exportação em segundo plano precisa montá-lo fora da árvore da rota.
 */
/** Leitura contínua de todas as lâminas ativas. Não gera arquivo: são os mesmos componentes já montados. */
function AllPagesView({ report, pages, containerRef }: { report: PanoramaReportModel; pages: ReportPageDefinition[]; containerRef: React.RefObject<HTMLDivElement> }) {
  return <div ref={containerRef} className="space-y-6">{pages.map((def) => (
    <div key={def.page} className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">Página {def.page} de {pages.length} · {def.title}</p>
      <SafeSheet def={def} report={report}/>
    </div>
  ))}</div>;
}

export function PanoramaExportDeck({ report, rootRef }: { report: PanoramaReportModel; rootRef: React.RefObject<HTMLDivElement> }) {
  const pages = panoramaManifestFor(report, MAPBOX_TOKEN);
  return <div ref={rootRef} className="panorama-export-root" aria-hidden="true">{pages.map((def) => <SafeSheet key={def.page} def={def} report={report}/>)}</div>;
}

export function ReportPaginator({ report }: { report: PanoramaReportModel }) {
  const [current, setCurrent] = useState(0); const [view, setView] = useState<'page' | 'all'>('page');
  const allPagesRef = useRef<HTMLDivElement>(null);
  const exportStatus = usePanoramaExportStore((state) => state.status);
  const exportFormat = usePanoramaExportStore((state) => state.format);
  const exportProgress = usePanoramaExportStore((state) => state.progress);
  const exportTotal = usePanoramaExportStore((state) => state.total);
  const exporting = panoramaExportIsRunning(exportStatus);
  const pages = useMemo(() => panoramaManifestFor(report, MAPBOX_TOKEN), [report]);
  const sections = useMemo(() => createPanoramaSections(pages, report.scope.entity), [pages, report.scope.entity]);
  useEffect(() => setCurrent((value) => Math.min(value, pages.length - 1)), [pages.length]);
  const page = pages[Math.min(current, pages.length - 1)];
  const jump = (number: number) => {
    setCurrent(Math.max(0, pages.findIndex((item) => item.page === number)));
    if (view === 'all') allPagesRef.current?.querySelector(`[aria-label^="Página ${number}:"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  // O trabalho pesado roda no host montado pelo shell: o usuário pode sair desta página.
  const exportPdf = () => usePanoramaExportStore.getState().start(report, 'pdf');
  const exportPptx = () => usePanoramaExportStore.getState().start(report, 'pptx');
  return <div className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><FileText className="h-4 w-4 text-primary"/><span className="text-sm font-medium">{view === 'all' ? `${pages.length} páginas · leitura contínua` : `Página ${page.page} de ${pages.length} · ${page.intention}`}</span></div><div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" disabled={view === 'all' || !current} onClick={() => setCurrent((v) => v - 1)}><ChevronLeft/>Anterior</Button><Button variant="outline" size="sm" disabled={view === 'all' || current === pages.length - 1} onClick={() => setCurrent((v) => v + 1)}>Próxima<ChevronRight/></Button><Button variant="outline" size="sm" aria-pressed={view === 'all'} onClick={() => setView((v) => (v === 'all' ? 'page' : 'all'))}>{view === 'all' ? <><FileText/>Uma página por vez</> : <><ListTree/>Ver todas as páginas</>}</Button>{report.scope.entity === 'fiergs-rs' && <Button variant="outline" size="sm" onClick={() => downloadFiergsAudit(report)}><Download/>Auditoria CSV</Button>}<Button variant="outline" size="sm" disabled={exporting} onClick={exportPptx}><Presentation/>{exporting && exportFormat === 'pptx' && exportStatus === 'capturing' ? `${exportProgress}/${exportTotal || pages.length}` : 'Baixar PPT espelho'}</Button><Button size="sm" disabled={exporting} onClick={exportPdf}>{exporting && exportFormat === 'pdf' ? <LoaderCircle className="animate-spin"/> : <Download/>}{exporting && exportFormat === 'pdf' ? (exportStatus === 'capturing' ? `${exportProgress}/${exportTotal || pages.length}` : 'Preparando PDF…') : 'Baixar PDF'}</Button></div></div>{exporting && <p className="text-sm text-muted-foreground">O arquivo está sendo gerado em segundo plano — você pode navegar pela plataforma sem interromper.</p>}<div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]"><aside className="rounded-xl border bg-card p-3"><div className="mb-2 flex items-center gap-2 text-sm font-semibold"><ListTree className="h-4 w-4"/>Sumário</div>{sections.map((section) => <button key={section.id} type="button" className={`block w-full rounded-md px-2 py-2 text-left text-xs transition-colors ${page.sectionId === section.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`} onClick={() => jump(section.start)}>{section.label}<span className="ml-1 text-muted-foreground">{section.start}–{section.end}</span></button>)}</aside>{view === 'all' ? <AllPagesView report={report} pages={pages} containerRef={allPagesRef}/> : <SafeSheet def={page} report={report}/>}</div></div>;
}
