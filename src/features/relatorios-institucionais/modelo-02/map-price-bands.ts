/** The five originals use these same R$/m² ranges, not standard families. */
export const MAP_PRICE_BANDS=[
 {limit:5000,label:'Até R$ 5.000',color:'#249ce4'},
 {limit:8000,label:'R$ 5.001 a R$ 8.000',color:'#60ad44'},
 {limit:12000,label:'R$ 8.001 a R$ 12.000',color:'#f5b400'},
 {limit:16000,label:'R$ 12.001 a R$ 16.000',color:'#9062ee'},
 {limit:Infinity,label:'Acima de R$ 16.000',color:'#ec6155'},
] as const;
export const UNKNOWN_MAP_PRICE={label:'Sem preço válido',color:'#737373'};
export const mapPriceBand=(value:number|null|undefined)=>typeof value==='number'&&Number.isFinite(value)&&value>0?MAP_PRICE_BANDS.find(b=>value<=b.limit)!:UNKNOWN_MAP_PRICE;
