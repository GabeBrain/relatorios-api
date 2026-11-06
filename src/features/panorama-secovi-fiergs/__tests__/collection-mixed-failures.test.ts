import {describe,it,expect,vi} from 'vitest';
import {collectByCity,isTransientCityFailure} from '../domain/collection';
import {PanoramaCollectionError,collectionFailureRow} from '../api';

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
