import {afterEach,describe,expect,it,vi} from 'vitest';
import {webcrypto} from 'node:crypto';
import {reviewProfile,executionReviewProfile,reviewCacheKey,reviewCost,reviewParameters,validateReviewContent,normalizeAtaLists,normalizeAtaLocation,recoverCompletedAtaResponse,reviewMaterialContext,stableReview} from '../../../../../../supabase/functions/_shared/reviewer';
import {callReviewProvider,reviewFailureResponse} from '../../../../../../supabase/functions/_shared/review-provider';
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
  expect(fetcher).toHaveBeenCalledTimes(1);expect(result.content).toBeNull();expect(result.meta.error).toBeTruthy();expect(result.meta.invalidOutput).toBe('{bad');expect(result.meta.reasoningTokens).toBe(250);expect(result.meta.outputTokens).toBe(300);
  const request=JSON.parse(fetcher.mock.calls[0][1].body);expect(request.reasoning_effort).toBe('high');expect(request.max_tokens).toBeUndefined();expect(result.meta.promptHash).toHaveLength(64);
 });
});

describe('falha sem uso confirmado: diagnóstico seguro, sem retry',()=>{
 afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();});
 it.each([
  ['timeout','REVIEW_PROVIDER_TIMEOUT','provider_transport',null],
  ['transport','REVIEW_PROVIDER_TRANSPORT','provider_transport',null],
  ['http','REVIEW_PROVIDER_HTTP','provider_http',429],
  ['envelope','REVIEW_PROVIDER_ENVELOPE','provider_envelope',200],
  ['usage','REVIEW_PROVIDER_USAGE_UNCONFIRMED','provider_usage',200],
 ] as const)('%s conserva fase/status sem expor conteúdo ou inventar consumo',async(kind,code,phase,status)=>{
  vi.stubGlobal('crypto',webcrypto);
  vi.stubGlobal('AbortSignal',{timeout:()=>new AbortController().signal});
  const secret='segredo-ou-documento-na-excecao';
  const fetcher=vi.fn();
  if(kind==='timeout'||kind==='transport'){
   const error=new Error(secret);error.name=kind==='timeout'?'TimeoutError':'TypeError';fetcher.mockRejectedValue(error);
  }else{
   const body=kind==='http'?JSON.stringify({error:{message:secret}}):kind==='envelope'?secret:JSON.stringify({choices:[]});
   fetcher.mockResolvedValue(new Response(body,{status:status!,headers:{'x-request-id':'req_fixture'}}));
  }
  vi.stubGlobal('fetch',fetcher);
  const logger=vi.spyOn(console,'error').mockImplementation(()=>{});
  const error=await callReviewProvider(secret,'gpt-6-luna','analyze-table-image',[{role:'user',content:secret}]).then(()=>null,error=>error);
  expect(error).toBeInstanceOf(Error);
  const result=reviewFailureResponse(error,'analyze-table-image','execution-fixture');
  expect(result).toMatchObject({errorCode:code,diagnostic:{phase,httpStatus:status}});
  expect(JSON.stringify(result)).not.toContain(secret);
  expect(result).not.toHaveProperty('inputTokens');expect(result).not.toHaveProperty('outputTokens');
  expect(fetcher).toHaveBeenCalledTimes(1);expect(logger).toHaveBeenCalledTimes(1);
  expect(logger.mock.calls[0][0]).not.toContain(secret);
  if(status!==null)expect(result.diagnostic).toMatchObject({requestId:'req_fixture'});
 });
 it('exceção interna também é identificada sem vazar a mensagem',()=>{
  const logger=vi.spyOn(console,'error').mockImplementation(()=>{});
  const result=reviewFailureResponse(new Error('segredo'),'analyze-ata-image','execution-fixture');
  expect(result).toMatchObject({errorCode:'REVIEW_INTERNAL_ERROR',diagnostic:{phase:'leaf_internal'}});
  expect(JSON.stringify(logger.mock.calls)).not.toContain('segredo');
 });
});

describe('ata com listas ausentes explícitas — incidente Rolândia',()=>{
 afterEach(()=>vi.unstubAllGlobals());
 const ata={cidade:null,uf:null,localizacao_fonte:'Toledo PR\nRolândia PR\nSão José dos Campos SP',produto:{dorms:null},observacoes_localizacao:null,cidades_candidatas:['Toledo/PR','Rolândia/PR','São José dos Campos/SP'],comentarios_sobrepostos:null,duvidas_cliente:null,pedidos_analista:['Análise sociodemográfica','Análise de locação']};
 it('converte somente as três listas null e preserva conteúdo e objeto original',()=>{
  const source={ata:structuredClone(ata)},before=JSON.stringify(source);
  expect(validateReviewContent('analyze-ata-image',source)).toBe(false);
  const result=normalizeAtaLists(source);
  expect(validateReviewContent('analyze-ata-image',result.content)).toBe(true);
  expect(result.fields).toEqual(['ata.observacoes_localizacao','ata.comentarios_sobrepostos','ata.duvidas_cliente']);
  expect(JSON.stringify(source)).toBe(before);
  expect(result.content).toMatchObject({ata:{observacoes_localizacao:[],comentarios_sobrepostos:[],duvidas_cliente:[],pedidos_analista:ata.pedidos_analista,cidades_candidatas:ata.cidades_candidatas,produto:{dorms:null}}});
  expect(normalizeAtaLists(result.content).fields).toEqual([]);
 });
 it('não corrige string, número, lista malformada ou campo ausente por suposição',()=>{
  for(const value of ['sem informação',0,[null],{}])expect(validateReviewContent('analyze-ata-image',normalizeAtaLists({ata:{...ata,duvidas_cliente:value}}).content)).toBe(false);
  const missing={...ata} as Record<string,unknown>;delete missing.duvidas_cliente;
  expect(validateReviewContent('analyze-ata-image',normalizeAtaLists({ata:missing}).content)).toBe(false);
  expect(normalizeAtaLists({ata:null})).toEqual({content:{ata:null},fields:[]});
 });
 it('não escolhe cidade em ata multi-estudo e mantém derivação única',()=>{
  expect(normalizeAtaLocation(ata)).toMatchObject({cidade:null,uf:null,cidades_candidatas:ata.cidades_candidatas});
  expect(normalizeAtaLocation({...ata,cidade:'Toledo',uf:'PR'})).toMatchObject({cidade:null,uf:null});
  expect(normalizeAtaLocation({...ata,localizacao_fonte:'Rolândia PR',cidades_candidatas:['Rolândia/PR']})).toMatchObject({cidade:'Rolândia',uf:'PR'});
 });
 it('retoma planilhas idênticas reextraídas em outra data, mas bloqueia mudança de conteúdo',()=>{
  const first={cidade:'Rolândia',uf:'PR',fonte:{gerado_em:'2026-10-21T10:00:00Z',blocos:[{valores:[1,2]}]}};
  const later={...first,fonte:{...first.fonte,gerado_em:'2026-10-21T11:00:00Z'}};
  expect(stableReview(reviewMaterialContext(first))).toBe(stableReview(reviewMaterialContext(later)));
  expect(first.fonte.gerado_em).toBe('2026-10-21T10:00:00Z');
  expect(stableReview(reviewMaterialContext(first))).not.toBe(stableReview(reviewMaterialContext({...later,fonte:{...later.fonte,blocos:[{valores:[1,3]}]}})));
  expect(stableReview(reviewMaterialContext(first))).not.toBe(stableReview(reviewMaterialContext({...later,cidade:'Toledo'})));
 });
 it('normaliza a resposta antes de validar sem repetir a chamada ou perder o uso',async()=>{
  vi.stubGlobal('crypto',webcrypto);
  vi.stubGlobal('AbortSignal',{timeout:()=>new AbortController().signal});
  const fetcher=vi.fn().mockResolvedValue(new Response(JSON.stringify({model:'gpt-6-luna',service_tier:'default',usage:{prompt_tokens:100,completion_tokens:1779,completion_tokens_details:{reasoning_tokens:1521}},choices:[{finish_reason:'stop',message:{content:JSON.stringify({ata})}}]})));
  vi.stubGlobal('fetch',fetcher);
  const result=await callReviewProvider('fake-not-a-secret','gpt-6-luna','analyze-ata-image',[{role:'user',content:'fixture JSON'}]);
  expect(fetcher).toHaveBeenCalledTimes(1);expect(result.meta).not.toHaveProperty('error');
  expect(result.meta).toMatchObject({normalizationVersion:'ata-null-lists-v1',inputTokens:100,outputTokens:1779,reasoningTokens:1521});
  expect(result.content).toMatchObject({ata:{duvidas_cliente:[],pedidos_analista:ata.pedidos_analista,cidades_candidatas:ata.cidades_candidatas}});
 });
 it('reapresenta somente resposta concluída compatível; consumo e erro originais intactos',()=>{
  const response={error:'O provedor retornou uso, mas a leitura está incompleta ou inválida. Confira antes de retomar.',finishReason:'stop',refusal:null,profileId:reviewProfile().id,invalidOutput:JSON.stringify({ata}),inputTokens:100,outputTokens:1779,costUsd:0.0010786};
  const before=JSON.stringify(response),result=recoverCompletedAtaResponse(response,reviewProfile().id);
  expect(result).toMatchObject({recoveredFromStoredResponse:true,normalizationVersion:'ata-null-lists-v1',inputTokens:100,outputTokens:1779,costUsd:0.0010786,ata:{cidade:null,uf:null}});
  expect(result).not.toHaveProperty('error');expect(result).not.toHaveProperty('invalidOutput');expect(JSON.stringify(response)).toBe(before);
  for(const patch of [{finishReason:'length'},{refusal:'recusado'},{profileId:'outro'},{error:'Falha de transporte'},{invalidOutput:'{bad'},{invalidOutput:JSON.stringify({ata:{...ata,duvidas_cliente:'errado'}})}])expect(recoverCompletedAtaResponse({...response,...patch},reviewProfile().id)).toBeNull();
 });
});
