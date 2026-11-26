import {fixture as cityFixture} from '../../modelo-03/__tests__/fixture';
import {REGIONS,citySelection,type City,type Selection} from '../model';
import type {Source} from '../types';
export const selection:Selection={region:'sul',quarter:3,year:2026};
export const catalogFor=(region='sul')=>Object.fromEntries(REGIONS.find(r=>r.id===region)!.capitals.map(([uf,city])=>[uf,[city]]));
export function fixture(s=selection,catalog=catalogFor(s.region)):Source[]{
 return Object.entries(catalog).flatMap(([uf,names])=>names.flatMap((city,cityIndex)=>{
  const c:City={uf,city},sources=cityFixture(citySelection(s,c)).filter(source=>source.metric==='details'?source.segment==='Vertical':source.metric==='stock'||source.group==='Padrão');
  for(const source of sources.filter(source=>source.metric==='details'))for(const row of source.rows){row.latitude=-23-cityIndex*.01;row.longitude=-48-cityIndex*.01;row.name='PRIVATE_NAME_DO_NOT_EXPORT';row.address='PRIVATE_ADDRESS';row.stock=99999;}
  return sources.filter(source=>source.metric!=='rentals');
 }));
}
