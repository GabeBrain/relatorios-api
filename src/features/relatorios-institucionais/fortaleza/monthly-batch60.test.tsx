import { afterEach,describe,expect,it,vi } from 'vitest';
import { cleanup,fireEvent,render,screen } from '@testing-library/react';
import { FORTALEZA_CITIES,prepareFortalezaBlueprint } from './model';
import FortalezaIntroSlides from './FortalezaIntroSlides';
import FortalezaClosingSlide from './FortalezaClosingSlide';
import { closingLines,createFortalezaEditorial,readFortalezaPhoto } from './monthly-closing';
import { buildFortalezaDiagnostic } from './diagnostic';
import type { FortalezaGenerationState } from './useFortalezaMarket';
import { monthlyMarketFixture,monthlyMarketSelection as selection } from './__tests__/monthly-market-fixture';
import { buildMonthlySlide } from './monthly-market';
const cities=[...FORTALEZA_CITIES];
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
async function generation():Promise<FortalezaGenerationState>{return {key:'Bearer private-token',phase:'done',startedAt:Date.parse('2026-11-10T15:00:00Z'),finishedAt:'2026-11-10T15:01:00Z',message:'Prévia organizada',report:null,hasFailedCities:false,blueprint:await prepareFortalezaBlueprint(selection,cities,{yieldControl:async()=>{}}),intro:{status:'ready',projects:[],issues:[],requests:15,startedAt:'',finishedAt:'2026-11-10T15:00:20Z'},monthlyLaunches:{sources:[],issues:[],market:monthlyMarketFixture()},steps:[]};}
describe('Fortaleza mensal56–60 e diagnóstico',()=>{
  it('encerra em60, mantém56–60na ordem e não cria61',()=>{
    render(<FortalezaIntroSlides selection={selection} cities={cities} data={null}/>);fireEvent.click(screen.getByRole('button',{name:'55'}));for(let page=56;page<=60;page++){fireEvent.click(screen.getByRole('button',{name:'Próximo'}));expect(screen.getByRole('img',{name:`Fortaleza · slide ${page}`})).toBeTruthy();}expect((screen.getByRole('button',{name:'Próximo'})as HTMLButtonElement).disabled).toBe(true);expect(screen.queryByRole('button',{name:'61'})).toBeNull();
  });
  it.each([56,60])('slide%s acompanha a competência selecionada',page=>{
    render(<FortalezaClosingSlide page={page} selection={{...selection,year:2027,position:1}} editorial={createFortalezaEditorial()}/>);expect(screen.getByText('janeiro de 2027')).toBeTruthy();
  });
  it('57/58têm seis e três integrantes; alterações não modificam a referência',()=>{
    const first=createFortalezaEditorial(),second=createFortalezaEditorial();expect(first.brain).toHaveLength(6);expect(first.sinduscon).toHaveLength(3);first.brain[0].name='Analista';expect(second.brain[0].name).toBe('Fábio Tadeu Araújo');
    const view=render(<FortalezaClosingSlide page={57} selection={selection} editorial={first}/>);expect(screen.getAllByLabelText(/Integrante \d/)).toHaveLength(6);first.brain[0].visible=false;view.rerender(<FortalezaClosingSlide page={57} selection={selection} editorial={first}/>);expect(screen.getAllByLabelText(/Integrante \d/)).toHaveLength(5);
  });
  it('edita nome/cargo, preserva ao navegar e permite restaurar a pessoa',()=>{
    render(<FortalezaIntroSlides selection={selection} cities={cities} data={null}/>);fireEvent.click(screen.getByRole('button',{name:'57'}));fireEvent.click(screen.getByText('Personalizar equipe e fotos'));fireEvent.change(screen.getByLabelText('Nome'),{target:{value:'Analista da edição'}});fireEvent.change(screen.getByLabelText('Cargo'),{target:{value:'Pesquisa de mercado'}});expect(screen.getByRole('img',{name:'Fortaleza · slide 57'}).textContent).toContain('Analista da edição');fireEvent.click(screen.getByRole('button',{name:'58'}));fireEvent.click(screen.getByRole('button',{name:'57'}));expect(screen.getByLabelText('Nome')).toHaveProperty('value','Analista da edição');fireEvent.click(screen.getByRole('button',{name:'Restaurar referência'}));expect(screen.getByLabelText('Nome')).toHaveProperty('value','Fábio Tadeu Araújo');
  });
  it('59aceita substituir a imagem institucional completa',()=>{
    const editorial=createFortalezaEditorial();editorial.board='data:image/png;base64,fixture';const {container}=render(<FortalezaClosingSlide page={59} selection={selection} editorial={editorial}/>);expect(container.querySelector('image')?.getAttribute('href')).toBe(editorial.board);
  });
  it('quebras longas respeitam os limites de linhas sem descartar palavras',()=>{
    const text='Nome muito longo de integrante para conferência';const lines=closingLines(text,12,2);expect(lines).toHaveLength(2);expect(lines.join(' ')).toBe(text);
  });
  it('imagem de tipo proibido, vazia ou acima de2MB é rejeitada antes da leitura',async()=>{
    await expect(readFortalezaPhoto(new File(['<svg/>'],'x.svg',{type:'image/svg+xml'}))).rejects.toThrow('PNG');await expect(readFortalezaPhoto(new File([],'x.png',{type:'image/png'}))).rejects.toThrow('2 MB');await expect(readFortalezaPhoto(new File([new Uint8Array(2*1024*1024+1)],'x.png',{type:'image/png'}))).rejects.toThrow('2 MB');
  });
  it('imagem que não decodifica não entra na prévia',async()=>{
    vi.stubGlobal('Image',class{decode(){return Promise.reject(new Error('Invalid'));}});await expect(readFortalezaPhoto(new File(['invalid'],'x.png',{type:'image/png'}))).rejects.toThrow('válida');
  });
  it('diagnóstico cobre60slides, conta estados e usa o horário do fechamento',async()=>{
    const state=await generation(),snapshot=buildFortalezaDiagnostic(selection,state);
    expect(snapshot.slides.map(slide=>slide.number)).toEqual(Array.from({length:60},(_,index)=>index+1));expect(Object.values(snapshot.summary).reduce((sum,count)=>sum+count,0)).toBe(60);expect(snapshot.summary['not-implemented']).toBe(0);expect(snapshot.generatedAt).toBe(state.finishedAt);expect(snapshot.homologated).toBe(false);expect(snapshot.slides[1].status).toBe('source-pending');expect(snapshot.slides[56].status).toBe('editorial-review');
    expect(snapshot.slides[21].values).toEqual(buildMonthlySlide(22,state.monthlyLaunches!.market!,selection,cities));
  });
  it('fonte ausente muda os slides dependentes e preserva os independentes',async()=>{
    const state=await generation();state.monthlyLaunches!.market!.sources.find(source=>source.city==='Aquiraz'&&source.segment==='Vertical'&&source.metric==='sales')!.complete=false;
    const snapshot=buildFortalezaDiagnostic(selection,state);expect(snapshot.slides[21].status).toBe('source-pending');expect(snapshot.slides[24].status).toBe('source-pending');expect(snapshot.slides[22].status).toBe('available');
  });
  it('JSON não exporta token, imagens ou históricos individuais',async()=>{
    const state=await generation();state.monthlyLaunches!.prices={scopeKey:'private-token',months:[],issues:[],sources:[{city:'Fortaleza',segment:'Vertical',complete:true,records:[{Authorization:'Bearer private-token',photo:'data:image/png;base64,private',typologies_history:[{secret:'individual'}]}],frames:{},issue:null,requests:1,startedAt:'',finishedAt:''}]};
    const value=JSON.stringify(buildFortalezaDiagnostic(selection,state));for(const forbidden of ['private-token','Authorization','data:image','typologies_history','individual'])expect(value).not.toContain(forbidden);
  });
  it('trimestral tem89posições e preserva pendência de fonte quando não há dados',async()=>{
    const state=await generation(),quarter={...selection,periodicity:'quarterly' as const,position:2};state.blueprint=await prepareFortalezaBlueprint(quarter,cities,{yieldControl:async()=>{}});state.monthlyLaunches=null;const snapshot=buildFortalezaDiagnostic(quarter,state);expect(snapshot.slides).toHaveLength(89);expect(snapshot.summary['not-implemented']).toBe(0);
  });
});
