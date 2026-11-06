import {describe,it,expect} from 'vitest';
import {render,cleanup} from '@testing-library/react';
import {AreaIvvSlide} from '../components/MarketSlides';
import {freeScopeReport} from './free-scopes.fixture';
import {panoramaManifestFor} from '../report/manifest';
import {buildGenerationNotices} from '../report/generation-notices';

describe('fechamento sem lançamentos',()=>{
  const scope={entity:'fiergs-rs' as const,engineVersion:'v4' as const,uf:'RS',cities:['A'],startQuarter:'1T2023' as const,endQuarter:'2T2026' as const};
  it('omite distribuição vazia, conserva séries agregadas e avisa na geração',()=>{
    const report=freeScopeReport(scope,{releaseDate:'2025-10-01'});const pages=panoramaManifestFor(report);
    expect(pages.some(p=>p.fiergsOfficialSlide===19)).toBe(false);
    expect(pages.some(p=>p.fiergsOfficialSlide===12)).toBe(true);
    expect(buildGenerationNotices(report).some(n=>n.affectedOfficialSlides.includes(19))).toBe(true);
  });
  it('mantém a distribuição mesmo com apenas um empreendimento/lançamento não nulo',()=>{
    const report=freeScopeReport(scope,{releaseDate:'2026-04-01'});
    expect(panoramaManifestFor(report).some(p=>p.fiergsOfficialSlide===19)).toBe(true);
  });
  it('mostra zero observado e percentual indisponível quando denominador é zero',()=>{
    const report=freeScopeReport(scope);const {container}=render(<AreaIvvSlide report={report}/>);
    const cells=[...container.querySelectorAll('.panorama-total-row td')].map(e=>e.textContent);
    expect(cells[4]).toBe('0');expect(cells[5]).toBe('—');cleanup();
  });
});
