import { FORTALEZA_CITIES,type FortalezaSelection } from '../model';
import { normalizePriceFrames,priceMonths,type PriceCollection,type PriceSource } from '../monthly-prices';
export function quarterlyPriceFixture(selection:FortalezaSelection):PriceCollection{
  const months=priceMonths(selection),sources=FORTALEZA_CITIES.flatMap((city,cityIndex)=>(['Vertical','Horizontal'] as const).map(segment=>{
    const products=segment==='Vertical'?['Econômico','Standard','Médio','Alto','Luxo']:['Condomínio de Casas','Loteamento Fechado','Loteamento Aberto'];
    const source:PriceSource={city,segment,complete:true,records:products.map((standard,index)=>({building_id:`${city}-${segment}-${index}`,city,state:'CE',building_type:segment,standard,release_date:'2020-01-01',neighborhood:`Bairro ${index+1}`,latitude:-3.6-.02*cityIndex-.005*index,longitude:-38.6+.025*cityIndex+.003*index,typologies:[{id:index+1,type_of_typology:'Padrão'}],typologies_history:months.map((month,offset)=>({typology_id:index+1,period:`${month}-01`,typology_stock:cityIndex+1,qty:100,number_bedroom:index%4+1,private_area:40+index*10,price:(1000+cityIndex*100+index*1000+offset*10)*(40+index*10),price_private_area:1000+cityIndex*100+index*1000+offset*10,sold_in_period:1}))})),frames:{},issue:null,requests:1,startedAt:'',finishedAt:''};
    source.frames=normalizePriceFrames(source,months);return source;
  }));return {scopeKey:'synthetic-quarterly',months,sources,issues:[]};
}
