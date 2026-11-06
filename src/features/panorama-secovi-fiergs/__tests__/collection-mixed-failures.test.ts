import {describe,it,expect,vi} from 'vitest';
import {collectByCity,isTransientCityFailure} from '../domain/collection';
import {PanoramaCollectionError,collectionFailureRow,unavailableRequiredCitySources} from '../api';

describe('falhas municipais de fontes mistas',()=>{
  const mixed='sales: HTTP rede/timeout; sales: resposta sem dados obrigatórios (HTTP 200); stock: HTTP rede/timeout; stock: resposta sem dados obrigatórios (HTTP 200) em Bom Retiro do Sul';
  it.each([mixed,'sales: HTTP 200; stock: HTTP 503','stock: HTTP 429'])('recupera falha transitória em %s',message=>expect(isTransientCityFailure(new Error(message))).toBe(true));
  it.each(['sales: HTTP 200; stock: HTTP 200','sales: HTTP 200; stock: HTTP 401','sales: HTTP rede/timeout; stock: HTTP 422'])('preserva falha sem recuperação automática em %s',message=>expect(isTransientCityFailure(new Error(message))).toBe(false));
  it('repete a cidade inteira após timeout misturado com vazio e recupera',async()=>{
    const task=vi.fn().mockRejectedValueOnce(new Error(mixed)).mockResolvedValue({complete:true});
    const result=await collectByCity(['Bom Retiro do Sul'],task,{attempts:3,sleep:async()=>{}});
    expect(task).toHaveBeenCalledTimes(2);expect(result.state).toBe('ready');
    expect(result.outcomes[0].attempts).toBe(2);
  });
  it('mantém botão recuperável quando auditoria classifica como transitório',()=>{
    const row=collectionFailureRow('Bom Retiro do Sul',mixed,3,1);
    expect(row.failureClass).toBe('transient');expect(row.status).toBe('sem resposta HTTP');
    const error=new PanoramaCollectionError([row]);
    expect(error.retryable).toBe(true);
  });
});


describe('completude tipológica de cidades exclusivamente horizontais',()=>{
  const available=(type='Horizontal')=>({available:true,rows:[{building_type:type,stock:12,liquid_sales:0}],source:'test'});
  const empty=(endpoint:'sales'|'stock')=>({available:false,rows:[],source:'test',issue:{endpoint,status:200,empty:true}});
  const sources=()=>({sales:available(),stock:available(),salesTypology:empty('sales'),stockTypology:empty('stock')});
  it('aceita tipologia vazia apenas com cadastro e duas fontes observadas exclusivamente horizontais',()=>{
    expect(unavailableRequiredCitySources([{building_type:'Horizontal'}],sources())).toEqual([]);
  });
  it.each([{buildings:[{building_type:'Vertical'}]},{buildings:[{building_type:'Horizontal'},{building_type:'Vertical'}]},{buildings:[{building_type:'desconhecido'}]},{buildings:[]}])('mantém exigência com cadastro vertical, misto, desconhecido ou vazio: %j',({buildings})=>{
    expect(unavailableRequiredCitySources(buildings,sources())).toHaveLength(2);
  });
  it('mantém exigência se alguma fonte temporal tem verticais ou tipo desconhecido',()=>{
    for(const type of ['Vertical','desconhecido'])expect(unavailableRequiredCitySources([{building_type:'Horizontal'}],{...sources(),stock:available(type)})).toHaveLength(2);
  });
  it('não dispensa falha de transporte, autenticação ou contrato em tipologia',()=>{
    for(const status of [null,401,422,500]){
      const source={available:false,rows:[],source:'test',issue:{endpoint:'sales' as const,status,empty:false}};
      expect(unavailableRequiredCitySources([{building_type:'Horizontal'}],{...sources(),salesTypology:source})).toEqual([source]);
    }
  });
  it('não dispensa vendas/oferta por padrão vazias nem as converte em zero',()=>{
    const set={...sources(),sales:empty('sales')};
    expect(unavailableRequiredCitySources([{building_type:'Horizontal'}],set)).toHaveLength(3);
  });
});
