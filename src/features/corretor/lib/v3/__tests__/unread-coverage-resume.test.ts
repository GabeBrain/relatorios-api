import {beforeEach,expect,it,vi} from 'vitest';
import {refreshUnreadCoverage} from '../db';
import type {Finding} from '../../audit/model';
const mocks=vi.hoisted(()=>({row:null as unknown,update:vi.fn(),eq:vi.fn(),is:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{from:()=>{
 const chain={select:()=>chain,eq:(...args:unknown[])=>{mocks.eq(...args);return chain;},is:(...args:unknown[])=>{mocks.is(...args);return chain;},
  maybeSingle:async()=>({data:mocks.row,error:null}),update:(value:unknown)=>{mocks.update(value);return chain;},
  then:(resolve:(value:unknown)=>unknown)=>Promise.resolve({error:null}).then(resolve)};
 return chain;
}}}));
const previous={id:'image-not-read',title:'2 imagens não lidas',detail:'falha: s4, s45',slideRef:'s4',viz:{kind:'text',evidence:'image12.jpg; image58.png'}};
const current={...previous,title:'1 imagem não lida',detail:'falha: s4',viz:{kind:'text',evidence:'image12.jpg'}} as Finding;
beforeEach(()=>{vi.clearAllMocks();mocks.row={payload:previous,status:'pendente',verdict:null,verdict_revisado:false};});
it('reduz a lacuna atual de dois slides para um sem perder a evidência anterior',async()=>{
 await refreshUnreadCoverage('study',[current]);
 expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({detalhe:'falha: s4',payload:expect.objectContaining({readCoverageHistory:[previous]})}));
 expect(mocks.update.mock.calls[0][0]).not.toHaveProperty('status');
 expect(mocks.eq).toHaveBeenCalledWith('status','pendente');expect(mocks.is).toHaveBeenCalledWith('verdict',null);
 expect(mocks.eq).toHaveBeenCalledWith('verdict_revisado',false);expect(mocks.eq).toHaveBeenCalledWith('detalhe',previous.detail);
});
it.each([{status:'corrigido'},{status:'ignorado'},{verdict:'fp'},{verdict_revisado:true}])('não sobrescreve decisão humana %j',async(decision)=>{
 mocks.row={...(mocks.row as object),...decision};await refreshUnreadCoverage('study',[current]);expect(mocks.update).not.toHaveBeenCalled();
});
it('não repete o histórico se a cobertura não mudou',async()=>{
 await refreshUnreadCoverage('study',[previous as Finding]);expect(mocks.update).not.toHaveBeenCalled();
});
