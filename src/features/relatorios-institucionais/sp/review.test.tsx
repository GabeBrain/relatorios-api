import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { reviewSpSlides, spReviewSnapshot } from './review';
import { buildSpTemporalPreview } from './temporal';
import { recordedInput } from './__tests__/recorded';
import { syntheticGranularBuildings } from './__tests__/granular-buildings';
import { syntheticLaunchSeries, syntheticSalesSeries, syntheticStockSeries } from './__tests__/launch-series';
import { buildSpStockSeries } from './stock-series';
import { buildSpLaunchSeries, buildSpSalesSeries } from './launch-series';
import { buildSpGranularDetails } from './granular-details';
import { blockedSpComparison } from './comparisons';
import { SpReportPages } from './SpReportPages';

function baseline(){
  const report=buildSpTemporalPreview(recordedInput(),'3T2026');
  report.launchSeries=buildSpLaunchSeries(syntheticLaunchSeries(),report);
  report.salesSeries=buildSpSalesSeries(syntheticSalesSeries(),report);
  report.stockSeries=buildSpStockSeries(syntheticStockSeries(),report);
  report.granularDetails=buildSpGranularDetails(syntheticGranularBuildings(),report);
  return report;
}
afterEach(()=>{cleanup();vi.unstubAllEnvs();});
describe('SP — revisão para testes práticos',()=>{
  it('cobre exatamente85 posições e distingue fonte não consultada, bloqueada e referência',()=>{
    const report=buildSpTemporalPreview(recordedInput(),'3T2026'),rows=reviewSpSlides(report,'test');
    expect(rows.map(row=>row.number)).toEqual(Array.from({length:85},(_,i)=>i+1));
    expect(rows.filter(row=>row.state==='reference')).toHaveLength(8);
    expect(rows[12].state).toBe('pending');expect(rows[0].state).toBe('available');
    expect(rows[49].state).toBe('pending');
    report.launchSeries={status:'blocked',issues:['Cancelada pelo usuário.']};
    expect(reviewSpSlides(report,'test')[17]).toMatchObject({state:'blocked',reason:'Cancelada pelo usuário.'});
    expect(reviewSpSlides(report,'test')[23].state).toBe('blocked');
    expect(reviewSpSlides(report,'test')[49].state).toBe('blocked');
  });
  it('não confunde segmento disponível com comparativo anual bloqueado nem INCC ausente com unidades',()=>{
    const report=baseline();
    report.launchSeries!.comparison=blockedSpComparison('Os dois anos não fecharam.');
    const rows=reviewSpSlides(report,'test');
    expect(rows[23]).toMatchObject({state:'blocked',reason:'Os dois anos não fecharam.'});
    expect(rows[20].state).toBe('available');expect(rows[25].state).toBe('pending');
    expect(rows[77].state).toBe('available');
  });
  it('isola lacuna de preço histórico, estágio, área e geocodificação',()=>{
    const report=baseline(),details=report.granularDetails!,market=details.market!;
    details.prices.series[53][0].value=null;details.prices.series[53][0].issue='Fotografia ausente.';
    market.stages.launched.ready=false;market.matrix.status='blocked';market.projects[0].latitude=null;
    const rows=reviewSpSlides(report,'test');
    expect(rows[52].state).toBe('partial');expect(rows[75].state).toBe('partial');
    expect(rows[72].state).toBe('blocked');expect(rows[66].state).toBe('partial');
    expect(rows[65].state).toBe('available');expect(rows[77].state).toBe('available');
  });
  it('sem chave não declara mapa completo e snapshot não transporta credencial ou dados individuais',()=>{
    const report=baseline();
    expect(reviewSpSlides(report,'')[66].state).toBe('partial');
    const json=JSON.stringify(spReviewSnapshot(report,reviewSpSlides(report,'secret-marker')));
    expect(json).not.toContain('secret-marker');expect(json).not.toMatch(/typologies_history|latitude|Empreendimento simulado/);
    expect(JSON.parse(json)).toMatchObject({exportAvailable:false,analystApproval:false,quarter:'3T2026'});
  });
  it('mantém o checklist separado do slide e a edição visível dentro da ampliação',()=>{
    vi.stubEnv('VITE_MAPBOX_ACCESS_TOKEN','');
    render(<SpReportPages report={baseline()}/>);
    expect(screen.getByRole('region',{name:'Checklist dos 85 slides'})).toHaveTextContent('85 posições implementadas');
    fireEvent.click(screen.getByRole('button',{name:'82. Equipe técnica nominal e fotos'}));
    fireEvent.click(screen.getByRole('button',{name:'Ampliar slides'}));
    expect(within(screen.getByRole('dialog')).getByRole('note')).toHaveTextContent('edição de referência 2T2026');
    expect(screen.getByRole('article')).not.toHaveTextContent('Checklist');
  });
});
