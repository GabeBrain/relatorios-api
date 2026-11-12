import { beforeEach, expect, it, vi } from 'vitest';
const mocks=vi.hoisted(()=>({identity:vi.fn(),prepare:vi.fn(),list:vi.fn(),save:vi.fn()}));
vi.mock('../projects',()=>({requireProjectIdentity:mocks.identity}));
vi.mock('../v3/pptx-store',()=>({savePptx:mocks.save}));
vi.mock('../v3/db',()=>({prepareStudyAtomic:mocks.prepare,listStudies:mocks.list,analysisPending:(s:{generation:string;analise?:unknown;status:string})=>s.generation==='v3'&&s.status!=='pronto'&&!s.analise}));
import { registerAccountPreparation, canStartAccountPreparation } from '../account-preparation';
const input={name:'estudo.pptx',sha1:'a'.repeat(40),nSlides:3,bytes:new Uint8Array([1]),findings:[]};
const pending={id:'draft',createdBy:'account',lastSha1:input.sha1,lastVersion:1,generation:'v3',status:'em_correcao',analise:null};
beforeEach(()=>{vi.clearAllMocks();mocks.identity.mockResolvedValue('account');mocks.save.mockResolvedValue(true);mocks.prepare.mockResolvedValue({id:'draft',created:true});mocks.list.mockResolvedValue([pending]);});
it('registra estudo da conta sem cidade, cadastro, planilhas ou análise e conserva original local',async()=>{
 expect(await registerAccountPreparation(input)).toEqual({studyId:'draft',ownerId:'account'});
 expect(mocks.prepare).toHaveBeenCalledWith('estudo',{sha1:input.sha1,nSlides:3,arquivo:'estudo.pptx'},[]);
 expect(mocks.save).toHaveBeenCalledWith(input.sha1,'estudo.pptx',input.bytes);
});
it('visitante continua local, sem criar registro nem inventar autor',async()=>{
 mocks.identity.mockRejectedValue(new Error('sem login'));expect(await registerAccountPreparation(input)).toBeNull();expect(mocks.prepare).not.toHaveBeenCalled();expect(mocks.save).not.toHaveBeenCalled();
});
it('duplicata da conta em preparação é reaproveitada, sem nova versão',async()=>{
 mocks.prepare.mockResolvedValue({id:'draft',created:false});
 expect(await registerAccountPreparation(input)).toEqual({studyId:'draft',ownerId:'account'});
 expect(await canStartAccountPreparation({studyId:'draft',ownerId:'account'},input.sha1)).toBe(true);
});
it('estudo já analisado ou pertencente a outra conta não vira nova preparação própria',async()=>{
 mocks.list.mockResolvedValue([{...pending,analise:{}}]);expect(await registerAccountPreparation(input)).toBeNull();
 mocks.list.mockResolvedValue([{...pending,createdBy:'another'}]);expect(await registerAccountPreparation(input)).toBeNull();
});
it('reconfere conclusão, hash e versão antes do início explícito',async()=>{
 for(const changed of [{analise:{}},{lastSha1:'b'.repeat(40)},{lastVersion:2}]){
  mocks.list.mockResolvedValue([{...pending,...changed}]);expect(await canStartAccountPreparation({studyId:'draft',ownerId:'account'},input.sha1)).toBe(false);
 }
});
it('troca de conta interrompe antes de permitir análise',async()=>{
 mocks.identity.mockResolvedValue('another');await expect(canStartAccountPreparation({studyId:'draft',ownerId:'account'},input.sha1)).rejects.toThrow('conta mudou');expect(mocks.list).not.toHaveBeenCalled();
});
