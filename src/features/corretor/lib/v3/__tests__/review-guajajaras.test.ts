import {afterEach,describe,expect,it,vi} from 'vitest';
import {webcrypto} from 'node:crypto';
import {reviewProfile,executionReviewProfile,reviewCacheKey,reviewCost,reviewParameters,validateReviewContent} from '../../../../../../supabase/functions/_shared/reviewer';
import {callReviewProvider} from '../../../../../../supabase/functions/_shared/review-provider';
import {isConversationalNote} from '../../audit/pptx-to-ir';
import {binsFromColumns,detectBinGap,checkTableSums} from '../../audit/engine';
import type {Ir,IrSlide} from '../../audit/ir';
import type {ExtractedTable} from '../../audit/model';
import type {AtaData} from '../ia-ata';
import type {CrossTableRef} from '../cross-table';
import {semanticReviewFindings,categoryCoverageFindings} from '../semantic-review';
import {ataCoverageFindings} from '../coverage-rules';
import {irForReviewProfile} from '../execution';

const slide=(n:number,titulo:string,textos:string[]):IrSlide=>({n,titulo,textos,secao_canonica:'SOCIO',fontes:[],notas:[],notas_edicao:[],notas_revisao:[],tabelas:[],graficos:[],n_imagens:0});
const deck=(slides:IrSlide[]):Ir=>({ir_version:1,arquivo:'derivado técnico — não é o original',n_slides:slides.length,slides});
const ref=(slide:number,title:string,rows:ExtractedTable['rows'],columns=['Situação','Até 1 km']):CrossTableRef=>({slide,source:'vision',sha1:`sha-${slide}`,secao:'SOCIO',titulo:title,table:{title,columns,rows,colKinds:['label','share']},reliable:true});

describe('Guajajaras: regras e contraexemplos, transcrição derivada identificada',()=>{
 it('propriedade 32/33: localiza ambos os valores sem escolher a verdade',()=>{
  const ir=deck([slide(33,'Índice de propriedade',['33,5%\nAté 1 km'])]);
  const result=semanticReviewFindings(ir,[ref(32,'Condição de ocupação',[['Próprio',68.5]])]);
  expect(result).toHaveLength(1);expect(result[0].slideRef).toBe('s33 × s32');expect(result[0].confidence).toBe(3);
  expect(result[0].viz.kind).toBe('sidebyside');
 });
 it('verticalização: aplica a regra fora dos números de slide do caso',()=>{
  expect(semanticReviewFindings(deck([slide(8,'Índice de verticalização',['97,5%\nAté 1 km'])]),[ref(7,'Tipologia dos domicílios',[['Apartamentos',95.7]])])).toHaveLength(1);
 });
 it('não associa renda sem rótulo nem compara anel com acumulado',()=>{
  const ir=deck([slide(27,'Renda média',['R$ 11.722','R$ 22.015']),slide(28,'Renda domiciliar',['R$ 19.941,94\nAté 1 km'])]);
  expect(semanticReviewFindings(ir,[ref(29,'Renda média',[['Renda média',20000]],['Indicador','De 1 a 2 km'])])).toHaveLength(0);
 });
 it('não compara percentual com quantidade absoluta, mesmo abaixo de 100',()=>{
  const table=ref(7,'Ocupação',[['Próprio',50]],['Situação','Até 1 km - Absoluto']);
  table.table.colKinds=['label','count'];
  expect(semanticReviewFindings(deck([slide(8,'Índice de propriedade',['66,4%\nAté 1 km'])]),[table])).toHaveLength(0);
 });
 it('não acusa valores compatíveis com arredondamento ou anos explicitamente diferentes',()=>{
  expect(semanticReviewFindings(deck([slide(1,'Propriedade 2025',['68,5%\nAté 1 km']),slide(2,'Propriedade 2026',['33,5%\nAté 1 km'])]),[])).toHaveLength(0);
  expect(semanticReviewFindings(deck([slide(1,'Propriedade',['68,5%\nAté 1 km']),slide(2,'Propriedade',['68,6%\nAté 1 km'])]),[])).toHaveLength(0);
 });
 it('s24: unidade incompatível é convite à conferência, sem alterar número',()=>{
  const result=semanticReviewFindings(deck([slide(24,'Variação anual dos domicílios',['75.298.796 hab.'])]),[]);
  expect(result).toHaveLength(1);expect(result[0].confidence).toBe(3);expect(result[0].viz).toMatchObject({evidence:'75.298.796 hab.'});
  expect(semanticReviewFindings(deck([slide(3,'População',['75.298.796 hab.'])]),[])).toHaveLength(0);
 });
 it('s63: o motor existente já identifica o cabeçalho sobreposto',()=>{
  const gap=detectBinGap(binsFromColumns(['Até 60 m²','31 a 40 m²','41 a 50 m²','51 a 60 m²']));
  expect(gap.gapAfterIndex).toBeDefined();
 });
 it('s32: soma atual fecha em 100%; não repetir a nota histórica',()=>{
  const t:ExtractedTable={title:'Ocupação',columns:['Situação','BH','Até 1 km','De 1 a 2 km','Até 2 km'],rows:[['Próprio',71.3,68.5,74.7,72.6],['Alugado',22.2,27.8,21.2,23.4],['Cedido',6.5,3.7,4.1,4]],totals:['Total',100,100,100,100],colKinds:['label','share','share','share','share']};
  expect(checkTableSums(t).badColumns??[]).toHaveLength(0);
 });
 it('s66: categoria omitida aparece como lacuna e substitui só sua soma',()=>{
  const count:CrossTableRef={...ref(66,'Oferta Lançada',[['Sem vaga',15],['1 vaga',818],['2 vagas',257],['3 vagas',0]],['Garagem','Unidades']),sha1:'same',titulo:'Garagem',sumFindingId:'sum-count'};
  count.table.totals=['Total',1204];count.table.colKinds=['label','count'];
  const rate={...ref(66,'Disponibilidade',[['Rotativa',4.4]],['Garagem','Taxa']),sha1:'same',titulo:'Garagem'};
  const result=categoryCoverageFindings([count,rate]);
  expect(result.findings).toHaveLength(1);expect(result.findings[0].detail).toContain('114');expect(result.findings[0].confidence).toBe(3);
  expect([...result.replacedSumIds]).toEqual(['sum-count']);
  expect(categoryCoverageFindings([count,{...rate,sha1:'other'}]).findings).toHaveLength(0);
 });
 it('pedido repetido na própria ata não comprova atendimento',()=>{
  const ata={produto:null,pedidos_analista:['Avaliar varanda e garagem'],duvidas_cliente:[]} as AtaData;
  const result=ataCoverageFindings(deck([slide(1,'Ata de abertura',['Avaliar varanda e garagem'])]),ata);
  expect(result[0].ok).toBe(false);expect(result[0].detail).toContain('sem evidência textual localizada');
  expect(ataCoverageFindings(deck([slide(1,'Ata de abertura',['Avaliar varanda e garagem'])]),ata,true)[0].ok).toBe(true);
 });
 it('retomada legada restaura texto e notas anteriores, sem mudar o novo IR',()=>{
  const s=slide(1,'Estudo',['Fato']);s.legacy_review={titulo:s.titulo,secao_canonica:s.secao_canonica,textos:['Fato','Ajustado'],fontes:[],notas:[],notas_edicao:[],notas_revisao:[]};
  const ir=deck([s]);expect(irForReviewProfile(ir,'review-legacy-continuous-v1').slides[0].textos).toEqual(['Fato','Ajustado']);
  expect(ir.slides[0].textos).toEqual(['Fato']);expect(irForReviewProfile(ir,reviewProfile().id)).toBe(ir);
 });
 it.each(['Ajustado','Ajustei as análises com a base revalidada','Eu retirei os padrões pois são de outro modelo','Conseguimos adicionar mais alguns pontos de varejo?','Não é o mesmo','Sobre o Via Blu, ainda não lançado'])('separa recado: %s',text=>expect(isConversationalNote(text)).toBe(true));
 it.each(['Renda média de R$ 11.722','A oferta foi ajustada pela sazonalidade','Produto pretendido: 25 a 26m², com garagem'])('preserva fato/premissa: %s',text=>expect(isConversationalNote(text)).toBe(false));
});

describe('contrato Luna/high e compatibilidade',()=>{
 afterEach(()=>vi.unstubAllGlobals());
 it('três tarefas Luna/high; legado intacto; snapshot adulterado rejeitado',()=>{
  const p=reviewProfile();expect(new Set(Object.values(p.models))).toEqual(new Set(['gpt-6-luna']));expect(p.reasoningEffort).toBe('high');
  expect(executionReviewProfile({}).models['analyze-text-batch']).toBe('gpt-4o');
  expect(()=>executionReviewProfile({reviewProfile:{...p,reasoningEffort:null}})).toThrow();
  expect(reviewParameters('gpt-4o-mini','analyze-table-image')).toEqual({max_tokens:4000});
  expect(reviewParameters('gpt-6-luna','analyze-table-image')).toMatchObject({max_completion_tokens:32768,reasoning_effort:'high',store:false});
 });
 it('cache Luna isolado e hash legado preservado',()=>{
  expect(reviewCacheKey('abc','vision','gpt-4o-mini')).toBe('abc');
  expect(reviewCacheKey('abc','ata','gpt-4o')).toBe('ata:abc');
  expect(reviewCacheKey('abc','vision','gpt-6-luna')).not.toBe('abc');
 });
 it('custo usa cache faturado sem somar raciocínio outra vez e reserva cobre contexto longo',()=>{
  const p=reviewProfile();expect(reviewCost(1000,500,200,'gpt-6-luna',p)).toBeCloseTo(0.000332,10);
  expect(reviewCost(p.inputMax,32768,0,'gpt-6-luna',p)).toBeGreaterThan(0.2);
  expect(()=>reviewCost(100,10,101,'gpt-6-luna',p)).toThrow();
 });
 it('JSON inválido não vira ausência de achados; schema recusa linhas malformadas',()=>{
  expect(validateReviewContent('analyze-text-batch',{})).toBe(false);
  expect(validateReviewContent('analyze-table-image',{tables:[{columns:['x'],rows:['bad']}],locais_visiveis:[],unidades:[],anomalias_formato:[],tem_fonte:false})).toBe(false);
 });
 it('uma chamada: contabiliza truncamento, sem repetir e sem aceitar lista vazia fabricada',async()=>{
  vi.stubGlobal('crypto',webcrypto);
  vi.stubGlobal('AbortSignal',{timeout:()=>new AbortController().signal});
  const fetcher=vi.fn().mockResolvedValue(new Response(JSON.stringify({model:'gpt-6-luna',service_tier:'default',usage:{prompt_tokens:100,completion_tokens:300,completion_tokens_details:{reasoning_tokens:250}},choices:[{finish_reason:'length',message:{content:'{bad'}}]}),{headers:{'x-request-id':'test-request'}}));
  vi.stubGlobal('fetch',fetcher);
  const result=await callReviewProvider('fake-not-a-secret','gpt-6-luna','analyze-text-batch',[{role:'user',content:'fixture'}]);
  expect(fetcher).toHaveBeenCalledTimes(1);expect(result.content).toBeNull();expect(result.meta.error).toBeTruthy();expect(result.meta.reasoningTokens).toBe(250);expect(result.meta.outputTokens).toBe(300);
  const request=JSON.parse(fetcher.mock.calls[0][1].body);expect(request.reasoning_effort).toBe('high');expect(request.max_tokens).toBeUndefined();expect(result.meta.promptHash).toHaveLength(64);
 });
});
