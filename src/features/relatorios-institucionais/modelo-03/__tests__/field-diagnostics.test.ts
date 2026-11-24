import {describe,it,expect} from 'vitest';
import {salesFieldReason,salesFieldDiagnostics} from '../field-diagnostics';
import {diagnostic} from '../diagnostic';
import {selectionKey} from '../model';
import {fixture,selection} from './fixture';
import type {Row,Report} from '../types';
describe('Diagnostic of invalid sales fields',()=>{
 it('distinguishes absent, null, blank, malformed and fractional values, accepting negative sales',()=>{
  expect(salesFieldReason({})).toBe('missing-field');
  for(const [value,reason] of [[null,'null'],[undefined,'undefined'],[' ','empty-string'],['bad','not-numeric-or-non-finite'],[{},'invalid-type'],[Infinity,'not-numeric-or-non-finite'],[1e20,'unsafe-number'],[1.5,'non-integer'],[-2,null],[0,null],['3',null]] as const)expect(salesFieldReason({sold_in_period:value})).toBe(reason);
 });
 it('identifies only affected selected-period rows and contextual neighbors without exposing whole payloads',()=>{
  const source=fixture()[0],building=source.rows[0];building.name='Problem project';building.Authorization='secret';
  const history=building.typologies_history as Row[];
  const affected=history.find(r=>String(r.period).startsWith('2026-05')&&r.typology_id===1)!;affected.sold_in_period=null;affected.token='secret';
  const view=salesFieldDiagnostics(source,'2026-04','2026-06');
  expect(view.total).toBe(1);expect(view.records[0]).toMatchObject({buildingId:'private-id',buildingName:'Problem project',typologyId:1,month:'2026-05',reason:'null',rawValue:null,previous:{month:'2026-04',rawValue:1},next:{month:'2026-06',rawValue:1}});
  expect(JSON.stringify(view)).not.toContain('secret');expect(JSON.stringify(view)).not.toContain('Private address');expect(salesFieldDiagnostics(source,'2026-06','2026-06').total).toBe(0);
  const report:Report={schema:'modelo-03-report-v1',selection,key:selectionKey(selection),startedAt:'2026-11-24',finishedAt:'2026-11-24',sources:[source],slides:[],errors:[],origin:'Geobrain API',homologated:false};
  expect(diagnostic(report).sources[0].salesFieldDiagnostics).toEqual(view);
 });
 it('bounds samples but keeps complete counts and indicates omissions',()=>{
  const source=fixture()[0];source.rows[0].typologies_history=Array.from({length:105},(_,i)=>({period:'2026-06-01',typology_id:i,sold_in_period:''}));
  const audit=salesFieldDiagnostics(source,'2026-04','2026-06');expect(audit).toMatchObject({total:105,returned:100,omitted:5,reasons:{'empty-string':105}});
 });
});
