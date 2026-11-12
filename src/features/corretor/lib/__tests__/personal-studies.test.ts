import { beforeEach, expect, it, vi } from 'vitest';
const mocks=vi.hoisted(()=>({identity:vi.fn(),from:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{from:mocks.from}}));
vi.mock('../projects',()=>({requireProjectIdentity:mocks.identity}));
import { personalStudyIds } from '../materials';
beforeEach(()=>{vi.clearAllMocks();mocks.identity.mockResolvedValue('verified-user');});
it('inclui autoria e cadastro posterior, deduplica e mantém compartilhados separados',async()=>{
 const queries:{table:string;field:string;uid:string}[]=[];
 mocks.from.mockImplementation((table:string)=>({select:()=>({eq:async(field:string,uid:string)=>{
  queries.push({table,field,uid});return {data:table==='studies_v3'?[{id:'created'}]:table==='corretor_projects'?[{study_id:'created'},{study_id:'registered-later'},{study_id:null}]:[{study_id:'shared'}],error:null};
 }})}));
 expect(await personalStudyIds()).toEqual({mine:['created','registered-later'],shared:['shared']});
 expect(queries).toContainEqual({table:'corretor_projects',field:'owner_id',uid:'verified-user'});
 expect(queries).toHaveLength(3);
});
it('visitante não consulta organização privada nem inventa vínculo',async()=>{
 mocks.identity.mockRejectedValue(new Error('sem login'));expect(await personalStudyIds()).toBeNull();expect(mocks.from).not.toHaveBeenCalled();
});
it('erro de consulta pessoal é explícito, não vira visitante nem lista vazia',async()=>{
 mocks.from.mockReturnValue({select:()=>({eq:async()=>({data:null,error:{code:'42501'}})})});
 await expect(personalStudyIds()).rejects.toThrow('confirmar');
});
