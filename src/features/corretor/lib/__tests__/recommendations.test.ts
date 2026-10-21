import { describe, expect, it, vi, beforeEach } from 'vitest';
import { partitionSlides, validateRecommendationSlides, prepareRequest, quoteRecommendation, recommendationCost, MAX_MEMO_BYTES, CONSULTING_RULES, recommendationProfile, LEGACY_RECOMMENDATION_PROFILE } from '../../../../../supabase/functions/_shared/recommendation';
import { recommendationSource } from '../v3/consulting-suggestion';
import type { Ir } from '../audit/ir';
import { studyHref, studySection } from '../study-navigation';
const slide=(n:number,text='Evidência do estudo. '.repeat(10))=>({n,titulo:`Slide ${n}`,conteudo:text});
describe('contrato consultivo e orçamento',()=>{
 it('reserva conservadora cobre a previsão sem cache presumido',()=>{const q=quoteRecommendation([slide(1)]);expect(q.requests).toBe(1);expect(q.maximumUsd).toBeGreaterThan(q.estimateUsd);expect(q.model).toBe(recommendationProfile().model);expect(quoteRecommendation([slide(1)],LEGACY_RECOMMENDATION_PROFILE).model).toBe('gpt-4o-mini');});
 it('divide em 181 slides e inclui compilação no custo',()=>{const slides=Array.from({length:181},(_,i)=>slide(i+1));const q=quoteRecommendation(slides);expect(partitionSlides(slides).map(b=>b.length)).toEqual([180,1]);expect(q.requests).toBe(3);expect(q.batches).toBe(2);});
 it('mede Unicode em bytes e limita a janela antes de cobrar',()=>{const slides=Array.from({length:40},(_,i)=>slide(i+1,'漢'.repeat(6000)));const batches=partitionSlides(slides);expect(batches.length).toBeGreaterThan(2);for(const b of batches)expect(()=>prepareRequest({slides:b})).not.toThrow();});
 it('recusa mais de dez lotes',()=>expect(()=>quoteRecommendation(Array.from({length:1800},(_,i)=>slide(i+1,'漢'.repeat(6000))))).toThrow('dez lotes'));
 it.each([[],[slide(1),slide(1)],[slide(0)],[slide(1,'x'.repeat(6001))]])('recusa conteúdo inválido %j',value=>expect(()=>validateRecommendationSlides(value)).toThrow());
 it('não aceita payload maior que um lote na função de IA',()=>expect(()=>prepareRequest({slides:Array.from({length:181},(_,i)=>slide(i+1))})).toThrow('dividido'));
 it('limita os memos e não aceita modo inventado',()=>{expect(()=>prepareRequest({mode:'compile',batches:[{firstSlide:1,lastSlide:10,content:'é'.repeat(MAX_MEMO_BYTES)}]})).toThrow();expect(()=>prepareRequest({mode:'inventado',slides:[slide(1)]})).toThrow();});
 it('contabiliza cache real com desconto sem confundir saída',()=>{expect(recommendationCost(1000,200,400)).toBeCloseTo(.00024);expect(()=>recommendationCost(100,0,101)).toThrow();expect(()=>recommendationCost(-1,0)).toThrow();});
 it('preserva os critérios Brain e as três seções',()=>{const p=prepareRequest({slides:[slide(1)]}).prompt;expect(p).toContain(CONSULTING_RULES);for(const h of ['## Avaliação da Consultoria','## Recomendação','## Orientação ao analista'])expect(p).toContain(h);});
 it('cobertura identifica ausência de texto e truncamento sem ler imagens',()=>{const ir={n_slides:3,slides:[{n:1,textos:['x'.repeat(7000)],tabelas:[]},{n:2,textos:[],tabelas:[]},{n:3,textos:[],tabelas:[{linhas:[['Cabeçalho','Preço'],['Mercado','12345 '.repeat(10)]]}]}]} as Ir;const s=recommendationSource(ir);expect(s.limitedSlides).toBe(1);expect(s.withoutText).toBe(1);expect(s.slides[0].conteudo.length).toBe(6000);expect(s.slides[1].conteudo).toContain('Mercado');});
 it('rota consultiva mantém versão e contexto',()=>{expect(studySection('recomendacao')).toBe('recomendacao');expect(studyHref('a','recomendacao','scope=mine','v2')).toContain('version=v2');});
});

const mocked=vi.hoisted(()=>({invoke:vi.fn(),rpc:vi.fn(),active:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{functions:{invoke:mocked.invoke},rpc:mocked.rpc}}));
vi.mock('../v3/execution',()=>({hasActiveExecution:mocked.active}));
import { runRecommendation, loadAiUsage } from '../recommendations';
const ir={n_slides:1,slides:[{n:1,textos:['evidência '.repeat(20)],tabelas:[]}]} as Ir;
const input=()=>({studyId:'a',version:1,sha1:'a'.repeat(40),ir,budgetUsd:1,cancelled:()=>false,onProgress:vi.fn()});
beforeEach(()=>{vi.clearAllMocks();mocked.active.mockReturnValue(false);localStorage.clear();});
describe('cliente sem chamada direta e sem repetição automática',()=>{
 it('cancelamento antes da confirmação não chama função',async()=>{await runRecommendation({...input(),cancelled:()=>true});expect(mocked.invoke).not.toHaveBeenCalled();});
 it('não inicia junto com uma revisão ativa',async()=>{mocked.active.mockReturnValue(true);await expect(runRecommendation(input())).rejects.toThrow('andamento');expect(mocked.invoke).not.toHaveBeenCalled();});
 it('executa exclusivamente pelo controlador e mostra o resultado persistido',async()=>{mocked.invoke.mockResolvedValueOnce({data:{id:'run',state:'prepared',profileId:recommendationProfile().id}}).mockResolvedValueOnce({data:{done:true,result:{id:'saved'}}});const p=input();await runRecommendation(p);expect(mocked.invoke.mock.calls.map(c=>c[0])).toEqual(['corretor-execution','corretor-execution']);expect(p.onProgress).toHaveBeenCalledWith({id:'saved'});});
 it('execução já concluída não gera nova chamada de etapa',async()=>{mocked.invoke.mockResolvedValue({data:{id:'run',state:'completed',profileId:recommendationProfile().id}});await runRecommendation(input());expect(mocked.invoke).toHaveBeenCalledOnce();});
 it('reserva desconhecida retorna erro sem retry',async()=>{mocked.invoke.mockResolvedValueOnce({data:{id:'run',state:'prepared',profileId:recommendationProfile().id}}).mockResolvedValueOnce({data:{error:'Retorno desconhecido'}});await expect(runRecommendation(input())).rejects.toThrow('Retorno desconhecido');expect(mocked.invoke).toHaveBeenCalledTimes(2);});
 it('métrica indisponível não vira zero',async()=>{mocked.rpc.mockResolvedValue({error:{message:'missing'}});await expect(loadAiUsage()).rejects.toThrow('indisponíveis');});
});
