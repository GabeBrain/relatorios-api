import { renderToStaticMarkup } from 'react-dom/server';
import { CustomFiergsStudyCover, CustomFiergsTerritoryCover } from '../../src/features/panorama-secovi-fiergs/components/CustomFiergsCovers';
import { customTerritoryPages } from '../../src/features/panorama-secovi-fiergs/report/custom-cover-layout';

export function fixtures() {
  const base = { entity: 'fiergs-rs' as const, uf: 'RS', cities: ['Canoas'], startQuarter: '1T2023' as const, endQuarter: '2T2026' as const };
  const cases = [
    ['canoas', ['Canoas']], ['duas', ['Canoas','Esteio']], ['conjunto', ['Canoas','Esteio','São Leopoldo']],
    ['quatro', ['Alvorada','Canoas','Esteio','São Leopoldo']], ['cinco', ['Alvorada','Canoas','Esteio','São Leopoldo','Viamão']],
    ['doze', Array.from({length:12},(_,i)=>`Município ${String(i+1).padStart(2,'0')}`)],
    ['treze', Array.from({length:13},(_,i)=>`Município ${String(i+1).padStart(2,'0')}`)],
    ['vinte-tres', Array.from({length:23},(_,i)=>`Município ${String(i+1).padStart(2,'0')}`)],
    ['longos', Array.from({length:13},(_,i)=>`São José do Vale das Palmeiras e da Serra ${i+1}`)],
    ['isolada-longa', ['São José do Vale das Palmeiras e da Serra do Rio das Pedras']],
    ['muito-longos', Array.from({length:7},(_,i)=>`São José do Vale das Palmeiras e da Serra do Rio das Pedras da Região dos Campos ${i+1}`)],
  ] as [string,string[]][];
  return cases.flatMap(([id,cities])=> {
    const scope={...base,cities};
    const pages=customTerritoryPages(scope);
    return [
      { id:`cover-${id}`,html:renderToStaticMarkup(<CustomFiergsStudyCover scope={scope}/>),count:cities.length },
      ...pages.map((names,index)=>({id:`territory-${id}-${index+1}`,html:renderToStaticMarkup(<CustomFiergsTerritoryCover scope={scope} cities={names}/>),count:names.length})),
    ];
  });
}
