import {marketMonth,normalizeMarketText,type MarketRow} from './market';
import {maceioPeriod,type MaceioSelection} from './model';
import {maceioSourceMonths,readNumber,type MaceioMarketSlidesData,type SlideSource} from './market-slides-data';
import {maceioBedroomIndex,maceioPatternFamily} from './classification';

const scalar=(value:unknown)=>typeof value==='string'||typeof value==='number'?String(value):'';
const family=(row:MarketRow|undefined,building:MarketRow)=>row?.standard_family??(row?.pattern!=null?maceioPatternFamily(row.pattern):building.standard_family??maceioPatternFamily(building.standard));
const csvCell=(value:unknown)=>{
  const text=scalar(value);
  return `"${(/^[\s]*[=+@-]/.test(text)&&typeof value!=='number'?"'":'')+text.replace(/"/g,'""')}"`;
};
/** Identifying evidence requested by Lucas. No arbitrary API fields or headers. */
export function buildMaceioDataIssuesReview(selection:MaceioSelection,data:MaceioMarketSlidesData|null){
  const end=maceioPeriod(selection).end.slice(0,7);
  const rows:unknown[][]=[];
  const collect=(sources:SlideSource[],months:string[])=>{
    for(const source of sources.filter(item=>item.metric==='details'))for(const building of source.rows){
      const release=marketMonth(building.release_date);
      const history=(Array.isArray(building.typologies_history)?building.typologies_history as MarketRow[]:[]).filter(row=>row&&typeof row==='object');
      const byType=new Map<string,MarketRow[]>();
      for(const row of history){const id=scalar(row.typology_id),part=byType.get(id)??[];part.push(row);byType.set(id,part);}
      for(const part of byType.values())part.sort((a,b)=>String(a.period).localeCompare(String(b.period)));
      const append=(month:string,reason:string,row?:MarketRow,previous?:MarketRow,next?:MarketRow,tid?:string)=>rows.push([
        source.city,building.building_type,building.name??building.building_name,building.building_id??building.id,tid??row?.typology_id,month,reason,
        previous?.period,next?.period,row?.typology_stock,row?.qty,row?.price,row?.private_area,row?.number_bedroom,row?.estagio_empreendimento??row?.building_status,
        row?.pattern??building.standard,family(row,building),previous?.typology_stock,previous?.qty,previous?.price,previous?.private_area,row?.sold_in_period,row?.releases_in_period,
      ]);
      const projectId=scalar(building.building_id??building.id).trim();
      if(!projectId)append(end,'Identificador do empreendimento ausente ou inválido');
      else if(source.rows.filter(candidate=>scalar(candidate.building_id??candidate.id).trim()===projectId).length>1)append(end,'Empreendimento duplicado na fonte');
      for(const row of history){
        const reasons:string[]=[];
        if(!scalar(row.typology_id).trim())reasons.push('Identificador de tipologia ausente ou inválido');
        if(!marketMonth(row.period))reasons.push('Competência histórica ausente ou inválida');
        if(reasons.length)append(scalar(row.period)||end,reasons.join('; '),row);
      }
      if(!release){append(end,'Data de lançamento ausente ou inválida');continue;}
      if(!Array.isArray(building.typologies_history)){append(end,'Histórico de tipologias ausente');continue;}
      for(const month of months){
        if(month<release){
          for(const row of history.filter(row=>marketMonth(row.period)===month))if([row.sold_in_period,row.releases_in_period].some(value=>{const n=readNumber(value,true);return n!==null&&n!==0;}))append(month,'Fluxo anterior ao lançamento: fora do recorte',row);
          continue;
        }
        let observed=false;
        for(const [tid,part] of byType){
          const current=part.filter(row=>marketMonth(row.period)===month);
          const previous=part.filter(row=>{const period=marketMonth(row.period);return period!==null&&period<month;}).at(-1);
          const next=part.find(row=>{const period=marketMonth(row.period);return period!==null&&period>month;});
          if(!current.length){if(previous)append(month,'Fotografia mensal ausente; valores anteriores são apenas evidência',undefined,previous,next,tid);continue;}
          observed=true;
          for(const row of current){
            const reasons:string[]=[];
            if(current.length>1)reasons.push('Fotografia duplicada');
            const stock=readNumber(row.typology_stock,false);
            if(stock===null)reasons.push('Estoque ausente ou inválido');
            if(stock!==null&&stock>0){
              if((readNumber(row.price,false,true)??0)<=0)reasons.push('Preço ausente, inválido ou zero');
              if((readNumber(row.private_area,false,true)??0)<=0)reasons.push('Área ausente, inválida ou zero');
              if(normalizeMarketText(building.building_type)==='vertical'&&maceioBedroomIndex(row.number_bedroom)===null)reasons.push('Dormitórios ausentes ou inválidos');
            }
            const capacity=readNumber(row.qty,false);
            if(capacity===null||stock!==null&&capacity<stock)reasons.push('Capacidade ausente, inválida ou menor que estoque');
            if(normalizeMarketText(building.building_type)==='vertical'&&((stock??0)>0||(capacity??0)>0)){
              if(!['compacto','economico','standard','medio','medio-alto','alto','luxo','super luxo'].includes(normalizeMarketText(row.pattern??building.standard)))reasons.push('Padrão histórico ausente ou não reconhecido');
              if(!['compactos','mcmv','medio padrao','luxo'].includes(normalizeMarketText(family(row,building))))reasons.push('Família histórica ausente ou não reconhecida');
            }
            if(normalizeMarketText(building.building_type)==='vertical'&&((stock??0)>0||(capacity??0)>0)&&!['planta','construcao','pronto'].includes(normalizeMarketText(row.estagio_empreendimento??row.building_status)))reasons.push('Estágio histórico ausente ou não reconhecido');
            if(readNumber(row.sold_in_period,true)===null)reasons.push('Vendas líquidas ausentes ou inválidas');
            if(reasons.length)append(month,reasons.join('; '),row,previous,next);
          }
        }
        if(!observed&&!history.some(row=>{const period=marketMonth(row.period);return period!==null&&period<month;}))append(month,'Empreendimento sem fotografia mensal');
      }
    }
  };
  const valid=data?.end===end;
  if(valid){collect(data.sources,maceioSourceMonths(selection));collect(data.horizontal??[],[end]);collect(data.commercial??[],[end]);}
  const header=['Cidade','Segmento','Empreendimento','ID empreendimento','ID tipologia','Competência','Motivo','Última fotografia anterior','Próxima fotografia','Estoque do mês','Capacidade do mês','Preço do mês','Área do mês','Dormitórios','Estágio do mês','Padrão','Família do padrão','Estoque anterior','Capacidade anterior','Preço anterior','Área anterior','Vendas líquidas do mês','Lançamentos explícitos do mês'];
  const complete=Boolean(valid&&[...data.sources,...(data.horizontal??[]),...(data.commercial??[])].filter(source=>source.metric==='details').every(source=>source.complete));
  return {count:rows.length,complete,csv:'\uFEFF'+[header,...rows].map(row=>row.map(csvCell).join(';')).join('\r\n')+'\r\n'};
}
export type MaceioDataIssuesReview=ReturnType<typeof buildMaceioDataIssuesReview>;
