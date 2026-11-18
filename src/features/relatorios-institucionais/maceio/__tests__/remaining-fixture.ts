import {offerPriceFixture} from './offer-price-fixture';
import {maceioCities,maceioPeriod,type MaceioSelection} from '../model';
import type {MarketRow} from '../market';
import type {SlideSource} from '../market-slides-data';
export function remainingFixture(selection:MaceioSelection){
  const data=offerPriceFixture(selection),families=['Luxo','Médio Padrão','MCMV','Compactos'];
  for(const source of data.sources.filter(source=>source.metric==='details'))for(const [i,building]of source.rows.entries()){
    building.standard_family=families[i];
    for(const row of building.typologies_history as MarketRow[]){row.qty=Number(row.typology_stock)*2;row.estagio_empreendimento=['Planta','Construção','Pronto'][i%3];}
  }
  const create=(city:string,commercial:boolean):SlideSource[]=>{
    const month=maceioPeriod(selection).end.slice(0,7),segment=commercial?'Comercial':'Horizontal',groups=commercial?['Econômico','Standard','Médio','Alto','Alto +']:['Condomínio de Casas','Loteamento Fechado','Loteamento Aberto'];
    const rows=groups.map((group,i)=>({city,state:'AL',building_type:segment,building_id:`synthetic/${segment}/${city}/${i}`,building_subtype:commercial?undefined:group,standard:group,release_date:`${2020+i}-01-01`,typologies:[{id:1,type_of_typology:'Padrão'}],typologies_history:[{period:`${month}-01`,typology_id:1,typology_stock:100*(i+1),qty:200*(i+1),price:(commercial?9000+2000*i:4000+1000*i)*50,private_area:50}]}));
    return [{city,metric:'details',group:'Empreendimento',rows,complete:true,issue:null,requests:1},{city,metric:'stock',group:'Padrão',rows:groups.map((group,i)=>({city,state:'AL',building_type:segment,period:`${month}-01`,group,stock:100*(i+1)})),complete:true,issue:null,requests:1}];
  };
  data.horizontal=maceioCities(selection.periodicity).flatMap(city=>create(city,false));
  if(selection.periodicity==='quarterly')data.commercial=create('Maceió',true);
  return data;
}
