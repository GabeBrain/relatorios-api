import { describe,expect,it } from 'vitest';
import { compareSpPriceMethods } from './price-method-comparison';
import type { SpObservation } from './granular-details';

const row=(meter:number,stock:number,qty:number):SpObservation=>({project:'synthetic',month:'2026-06',standard:'Standard',bedrooms:1,area:50,stock,qty,meter,price:meter*50,sales:0,release:'2020-01',sold:0,stage:'Pronto'});
describe('SP comparação exploratória dos pesos de preços',()=>{
  it('distingue estoque, quantidade e média simples ao incluir esgotadas',()=>{
    const rows=[row(10000,10,10),row(30000,0,30)],before=JSON.stringify(rows);
    const result=compareSpPriceMethods(rows,'2026-06',53,null);
    expect(result.methods.map(method=>method.value)).toEqual([10000,25000,20000]);
    expect(result.population).toMatchObject({typologies:2,positiveStock:1,zeroStock:1});
    expect(JSON.stringify(rows)).toBe(before);
  });
  it('incluir esgotadas também pode reduzir a média; não escolhe o resultado mais próximo do original',()=>{
    expect(compareSpPriceMethods([row(30000,10,10),row(10000,0,30)],'2026-06',53,null).methods.map(method=>method.value)).toEqual([30000,15000,20000]);
  });
  it('não ignora preço ou quantidade ausentes para aparentar uma média completa',()=>{
    const missing=row(30000,0,30);missing.meter=null;
    const result=compareSpPriceMethods([row(10000,10,10),missing],'2026-06',53,'Cobertura parcial.');
    expect(result.methods.map(method=>method.value)).toEqual([10000,null,null]);
    expect(result.coverageIssue).toBe('Cobertura parcial.');
    missing.meter=30000;missing.qty=null;
    expect(compareSpPriceMethods([missing],'2026-06',53,null).methods[1].value).toBeNull();
  });
  it('mantém recortes sem MCMV e não divide por base zero',()=>{
    const economic={...row(10000,10,10),standard:'Econômico'},two={...row(20000,10,10),bedrooms:2};
    expect(compareSpPriceMethods([economic,two],'2026-06',55,null).methods.every(method=>method.value===null)).toBe(true);
    expect(compareSpPriceMethods([economic,two],'2026-06',57,null).methods.map(method=>method.value)).toEqual([20000,20000,20000]);
  });
});
