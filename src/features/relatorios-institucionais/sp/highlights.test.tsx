import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {syntheticWindow} from './__tests__/synthetic-window';
import {buildSpTemporalPreview,quarterMonths} from './temporal';
import {shiftSpMonth} from './project-trends';
import {SP_API_PATTERNS} from './segments';
import {buildSpLaunchSeries,buildSpSalesSeries,spFlowWindow} from './launch-series';
import {SpHighlightsSlide} from './SpHighlightsSlide';
import {SpTrendSlide} from './SpTrendSlide';
import {SpSlideContent} from './SpReportPages';
import {reviewSpSlides,spReviewSnapshot} from './review';
import type {SpPreview} from './model';

function setup(quarter:SpPreview['quarter']='2T2026',partial=3){
  const months=quarterMonths(quarter).slice(0,partial),end=months.at(-1)!,input=syntheticWindow('09');
  const offset=(Number(months[0].slice(0,4))-2026)*12+Number(months[0].slice(5))-7;
  for(const key of ['releases','sales','stock'] as const)input[key]=input[key].map(row=>({...row,period:`${shiftSpMonth(String(row.period).slice(0,7),offset)}-01`})).filter(row=>String(row.period).slice(0,7)<=end);
  input.windowEnd=end;
  const report=buildSpTemporalPreview(input,quarter);
  const history=(key:'releases'|'sales')=>{
    const rows=[];
    for(let month='2021-01';month<=end;month=shiftSpMonth(month,1))for(const [i,group] of SP_API_PATTERNS.entries())rows.push(input[key].find(row=>row.period===`${month}-01`&&row.group===group)??{period:`${month}-01`,group,building_type:'Vertical',[key==='releases'?'releases_in_period':'liquid_sales']:100+i*10+Number(month.slice(5))});
    return rows;
  };
  report.launchSeries=buildSpLaunchSeries(history('releases'),report);report.salesSeries=buildSpSalesSeries(history('sales'),report);
  return report;
}
const count=(n:number)=>n.toLocaleString('pt-BR');
describe('SP — coerência dos destaques e referência visual',()=>{
  it.each([['2T2026',3],['2T2026',2],['1T2027',3],['4T2025',3]] as const)('calcula acumulado janeiro-fechamento em%s com%smeses do trimestre', (quarter,partial)=>{
    const report=setup(quarter,partial),end=report.throughMonth!,year=spFlowWindow(report.launchSeries,`${end.slice(0,4)}-01`,end)!;
    expect(report.launchSeries!.status).toBe('ready');expect(year.months).toHaveLength(Number(end.slice(5)));
    const svg=renderToStaticMarkup(<SpHighlightsSlide report={report} slide={9}/>);
    expect(svg).toContain(count(year.mcmv));expect(svg).toContain(count(year.total));expect(svg).toContain('acumulado do ano');
    expect(svg).not.toContain('informado pela API');expect(svg).not.toContain('padrão Econômico');
    const rolling=spReviewSnapshot(report,reviewSpSlides(report)).highlightAudit.launches.last12Months!;
    expect(rolling.months).toHaveLength(12);expect(rolling.start).toBe(shiftSpMonth(end,-11));
    expect(rolling.mcmv).toBe(report.launchSeries!.breakdown!.mcmv!.rolling.at(-1)!.value);
    expect(rolling.total).toBe(rolling.mcmv+rolling.others);
  });
  it('não troca ano acumulado pelo trimestre nem preenche mês anual ausente',()=>{
    const report=setup(),year=spFlowWindow(report.launchSeries,'2026-01','2026-06')!,quarter=spFlowWindow(report.launchSeries,'2026-04','2026-06')!;
    expect(year.share).not.toBe(quarter.share);
    report.launchSeries!.monthly=report.launchSeries!.monthly!.filter(row=>row.month!=='2026-01');
    expect(reviewSpSlides(report)[8].state).toBe('pending');
    expect(renderToStaticMarkup(<SpHighlightsSlide report={report} slide={9}/>)).toContain('Destaque em conferência');
  });
  it('separa vendas MCMV do trimestre das vendas totais e MCMV em12meses',()=>{
    const report=setup(),audit=spReviewSnapshot(report,reviewSpSlides(report)).highlightAudit.sales;
    const svg=renderToStaticMarkup(<SpHighlightsSlide report={report} slide={10}/>);
    expect(svg).toContain(count(audit.quarter!.mcmv));expect(svg).toContain(count(audit.previousYearQuarter!.mcmv));
    expect(svg).toContain(`o mercado totalizou ${count(audit.last12Months!.total)}`);expect(svg).toContain(`${count(audit.last12Months!.mcmv)} foram de unidades MCMV`);
    expect(svg).not.toContain('distratos permanecem');expect(svg).not.toContain('padrão Econômico');
    expect(audit.metric).toBe('liquid_sales');
  });
  it('mantém as nove divisórias da arte original sem o placeholder genérico',()=>{
    for(const page of [8,12,31,45,49,52,60,65,81]){
      const html=renderToStaticMarkup(<SpSlideContent report={setup()} page={page}/>);
      expect(html).toContain(`divider-${String(page).padStart(2,'0')}.png`);expect(html).toContain('Título da seção');expect(html).not.toContain('Estrutura do relatório original');
    }
  });
  it('destaca cinco trimestres equivalentes na série de17pontos',()=>{
    const report=setup(),svg=renderToStaticMarkup(<SpTrendSlide report={report} number={18}/>);
    const audit=spReviewSnapshot(report,reviewSpSlides(report)).numericAudit;
    expect(audit.trendSlides.find(row=>row.slide===18)!.series[0].points.at(-1)!.value).toBe(report.metrics.launches);
  });
});
