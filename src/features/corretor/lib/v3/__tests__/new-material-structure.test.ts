import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pptxToIr } from '../../audit/pptx-to-ir';
import { findTableImages } from '../table-images';
import { irToFindings } from '../../audit/ir-rules';
import { extractFonteFromExcel } from '../fonte-extractor-browser';
describe.skipIf(!process.env.CORRETOR_NEW_MATERIAL)('material novo do Drive — extração gratuita',()=>{
 it('extrai panorama regional sem pedir visão/texto pagos e registra limites',async()=>{
  const file=process.env.CORRETOR_NEW_MATERIAL!;const bytes=new Uint8Array(readFileSync(file));
  const ir=await pptxToIr(bytes,'2026.06_ADEMIGO_PANORAMA_GOIANIA_E_AP._DE_GOIANIA_VAP_21ago.pptx');
  const candidates=await findTableImages(bytes,ir);
  const findings=irToFindings(ir);
  expect(ir.n_slides).toBeGreaterThan(10);expect(ir.slides.some(s=>s.textos.join(' ').includes('GOIÂNIA'))).toBe(true);
  expect(candidates.length).toBeGreaterThan(0);
  const result={file,sha256:createHash('sha256').update(bytes).digest('hex'),sha1:ir.sha1,slides:ir.n_slides,nativeTables:ir.slides.reduce((n,s)=>n+s.tabelas.length,0),imageCandidates:candidates.length,findings:findings.filter(f=>!f.ok).map(f=>({id:f.id,type:f.type,title:f.title})),scope:'extração e DET somente; sem gabarito humano/fonte pareada, sem cobertura de tabelas-imagem'};
  if(process.env.CORRETOR_NEW_MATERIAL_EXCEL){
   const excelPath=process.env.CORRETOR_NEW_MATERIAL_EXCEL;const raw=readFileSync(excelPath);
   const source=await extractFonteFromExcel([{name:'1. Relatório Ademi- GO 06.2026_VFINAL.xlsx',size:raw.length,arrayBuffer:async()=>Uint8Array.from(raw).buffer} as File],'material-drive-GO-junho');
   Object.assign(result,{excel:{sha256:createHash('sha256').update(raw).digest('hex'),blocks:source.blocos.length,warnings:source.avisos,inventory:source.inventario}});
  }
  if(process.env.CORRETOR_NEW_MATERIAL_OUT)writeFileSync(process.env.CORRETOR_NEW_MATERIAL_OUT,JSON.stringify(result,null,2));
  console.log('[material novo]',JSON.stringify({...result,findings:result.findings.length}));
 },120000);
});
