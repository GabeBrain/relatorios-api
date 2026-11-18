import {describe,it,expect,vi} from 'vitest';
import {buildCagedSlide,cagedChange,cagedBalance,cagedIssue,parseCagedReport} from './caged';
import {collectMaceioCaged} from './caged-api';
import {cagedFixture} from './__tests__/caged-fixture';
import {MACEIO_CITIES_MONTHLY,type MaceioSelection} from './model';
const selection:MaceioSelection={uf:'AL',city:'Maceió',territory:'capital-rm',periodicity:'monthly',year:2026,position:5};
describe('CAGED MTE · contrato e comparativos',()=>{
 it('confirma versão, grids, total Brasil com NI e saldos negativos',()=>{
  const fixture=cagedFixture('2026-05','2020-01'),report=parseCagedReport(fixture,'2026-05');
  expect(cagedBalance(report,'2026-05','AL','construction')).toBe(-10);
  expect(cagedBalance(report,'2017','BR','total')).toBeNull();
  expect(cagedBalance(report,'2026-05','BR','total')).toBeGreaterThan(report.rows.filter(row=>row.period==='2026-05'&&row.sector==='total'&&!['BR','NI'].includes(row.uf)).reduce((n,r)=>n+r.balance,0));
 });
 it.each(['missing','duplicate','string','boolean','unbalanced','source','period','revision','snapshot'])('rejeita fonte incompleta/corrompida: %s',mutation=>{
  const fixture=cagedFixture();
  if(mutation==='missing')fixture.rows.pop();if(mutation==='duplicate')fixture.rows.push({...fixture.rows[0]});
  if(mutation==='string')Object.assign(fixture.rows[0],{balance:'1'});if(mutation==='boolean')Object.assign(fixture.rows[0],{balance:false});
  if(mutation==='unbalanced')fixture.rows[0].balance++;if(mutation==='source')fixture.source='RAIS';if(mutation==='period')fixture.end='2026-06';if(mutation==='revision')fixture.coverageStart='2027-01';if(mutation==='snapshot')fixture.snapshotVersion='partial';
  expect(()=>parseCagedReport(fixture,'2026-05')).toThrow();
 });
 it('preserva zero, negativos, base zero e ausência sem percentual inventado',()=>{
  expect(cagedChange(-98,-227)).toBeCloseTo(56.828);expect(cagedChange(1,0)).toBeNull();expect(cagedChange(null,10)).toBeNull();
  const report=cagedFixture();report.completePeriods=[];report.rows=[];expect(parseCagedReport(report,report.end).rows).toEqual([]);expect(cagedIssue(selection,{report,issue:null})).toMatch(/cobertura/);
 });
 it('mensal e trimestral usam mês de fechamento e ano parcial, sem somar o trimestre outra vez',()=>{
  const monthly=buildCagedSlide(12,selection,{report:cagedFixture('2026-05','2020-01'),issue:null});expect(monthly.rows[1].values.at(-2)).toBe(-10);expect(monthly.rows[1].values[0]).toBeNull();expect(monthly.warning).toMatch(/2020/);
  const quarterly={...selection,periodicity:'quarterly' as const,position:2};const quarter=buildCagedSlide(12,quarterly,{report:cagedFixture('2026-06'),issue:null});
  expect(quarter.rows[1].values.at(-2)).toBe(-10);expect(quarter.labels.at(-2)).toMatch(/26/);expect(quarter.issue).toBeNull();
  expect(buildCagedSlide(13,quarterly,{report:cagedFixture('2026-06'),issue:null}).rows).toHaveLength(5);
  expect(buildCagedSlide(14,quarterly,{report:cagedFixture('2026-06'),issue:null}).rows).toHaveLength(18);
  const full=parseCagedReport(cagedFixture(),'2026-05');expect(full.completePeriods).toContain('2017');expect(buildCagedSlide(12,selection,{report:full,issue:null}).warning).toBeNull();
 });
 it('não reutiliza competência antiga ou resultado após troca de seleção',()=>{
  expect(buildCagedSlide(9,{...selection,position:6},{report:cagedFixture(),issue:null}).issue).toBeTruthy();
  const report=cagedFixture();report.completePeriods=report.completePeriods.filter(p=>p!=='2026');report.rows=report.rows.filter(r=>r.period!=='2026');expect(cagedIssue(selection,{report,issue:null})).toMatch(/cobertura/);
 });
 it('consulta só Edge com o período, conserva cancelamento e sanitiza falhas',async()=>{
  vi.stubEnv('VITE_SUPABASE_URL','https://fixture.invalid');vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY','public-test-key');
  try{
   const request=vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({report:cagedFixture()}),{status:200}));
   const result=await collectMaceioCaged(selection,[...MACEIO_CITIES_MONTHLY],{token:'private-token',request});expect(result.report?.end).toBe('2026-05');expect(JSON.stringify(result)).not.toContain('private-token');
   expect(JSON.parse(String(request.mock.calls[0][1]?.body))).toEqual({periodicity:'monthly',year:2026,position:5});
   request.mockResolvedValue(new Response('private provider details',{status:502}));const backup=await collectMaceioCaged(selection,[...MACEIO_CITIES_MONTHLY],{token:'x',request});expect(backup.issue).toBeNull();expect(backup.delivery?.kind).toBe('verified-snapshot');expect(JSON.stringify(backup)).not.toMatch(/private/);
   const controller=new AbortController();controller.abort();await expect(collectMaceioCaged(selection,[...MACEIO_CITIES_MONTHLY],{token:'x',signal:controller.signal,request})).rejects.toMatchObject({name:'AbortError'});
   await expect(collectMaceioCaged(selection,['Maceió'],{token:'x',request})).rejects.toThrow(/recorte/);
  }finally{vi.unstubAllEnvs();}
 });
});
