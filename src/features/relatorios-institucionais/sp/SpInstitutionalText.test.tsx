import { afterEach,describe,expect,it } from 'vitest';
import { cleanup,render,screen } from '@testing-library/react';
import { SpSlideContent } from './SpReportPages';
import { spInstitutionalMonth } from './institutional-content';
import { buildSpTemporalPreview } from './temporal';
import { recordedInput } from './__tests__/recorded';
import { reviewSpSlides } from './review';
afterEach(cleanup);
const report=()=>buildSpTemporalPreview(recordedInput(),'3T2026');
describe('Textos institucionais editáveis',()=>{
  it.each([['2026-03','MARÇO DE 2026'],['2026-06','JUNHO DE 2026'],['2026-09','SETEMBRO DE 2026'],['2026-12','DEZEMBRO DE 2026'],['2027-03','MARÇO DE 2027'],['2026-08','AGOSTO DE 2026']])('usa a competência efetiva %s', (throughMonth,label)=>{
    const input={...report(),throughMonth};
    render(<SpSlideContent report={input} page={7}/>);
    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.getByText('25,6% da população do estado').tagName.toLowerCase()).toBe('text');
    expect(screen.getByText('39,6% do potencial de consumo do estado').tagName.toLowerCase()).toBe('text');
    if(throughMonth!=='2026-06')expect(screen.queryByText('JUNHO DE 2026')).not.toBeInTheDocument();
  });
  it('expõe números e legendas dos seis cartões GeoBrain como texto SVG nativo',()=>{
    const {container}=render(<SpSlideContent report={report()} page={5}/>);
    expect(container.querySelectorAll('svg text')).toHaveLength(18);
    for(const value of ['+12.500','+18.000','+650.000','6,6M','+45.000','R$ 434 Bi'])expect(screen.getByText(value).tagName.toLowerCase()).toBe('text');
    expect(screen.getByText('empresas pesquisadas')).toBeInTheDocument();
    expect(reviewSpSlides(report()).find(s=>s.number===5)?.state).toBe('reference');
    expect(reviewSpSlides(report()).find(s=>s.number===7)?.state).toBe('reference');
  });
  it('não inventa data quando a competência não foi confirmada',()=>{
    expect(spInstitutionalMonth({...report(),throughMonth:undefined,closingMonth:null})).toBe('PERÍODO NÃO CONFERIDO');
  });
});
