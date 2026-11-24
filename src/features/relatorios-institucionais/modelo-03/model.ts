export type Periodicity = 'monthly' | 'quarterly' | 'semiannual';
export interface Selection { uf: string; city: string; entity: string; periodicity: Periodicity; year: number; position: number; includeRm: boolean; rmCities: string[] }
export const norm = (v: unknown) => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
export const periodSize = (p: Periodicity) => p === 'monthly' ? 1 : p === 'quarterly' ? 3 : 6;
export const shift = (month: string, n: number) => { const [y,m]=month.split('-').map(Number); return new Date(Date.UTC(y,m-1+n,1)).toISOString().slice(0,7); };
export function period(s: Selection) {
  const size=periodSize(s.periodicity), end=`${s.year}-${String(s.position*size).padStart(2,'0')}`, start=shift(end,1-size);
  const label=s.periodicity==='monthly'?`${new Intl.DateTimeFormat('pt-BR',{month:'long',timeZone:'UTC'}).format(new Date(`${end}-01T12:00:00Z`))} de ${s.year}`:`${s.position}º ${s.periodicity==='quarterly'?'trimestre':'semestre'} de ${s.year}`;
  return {start,end,label,size};
}
export function periodIssue(s:Selection, now=new Date()):string|null {
  if(!Number.isInteger(s.year)||s.year<2021||s.year>now.getFullYear()||!Number.isInteger(s.position)||s.position<1||s.position>12/periodSize(s.periodicity)) return 'Competência inválida.';
  const p=period(s), current=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit'}).format(now);
  return p.end>=current?'Selecione um período já encerrado.':null;
}
/** RM selections carry UF explicitly, including cross-state study areas such as Teresina/Timon. */
export const location=(value:string,uf:string)=>value.includes('|')?{uf:value.split('|')[0],city:value.slice(value.indexOf('|')+1)}:{uf,city:value};
export const rmLabel=(value:string,uf:string)=>{const l=location(value,uf);return `${l.city} / ${l.uf}`;};
export function selectedCities(s:Selection) { return [`${s.uf}|${s.city}`,...s.includeRm?s.rmCities:[]]; }
export function scopeIssue(s:Selection, catalog:Record<string,string[]>|null):string|null {
  if(!s.entity.trim())return 'Selecione a entidade do relatório.';
  if(!catalog||!s.uf||!s.city)return 'Confirme UF e cidade no catálogo autorizado do Geobrain.';
  const cities=selectedCities(s).map(c=>location(c,s.uf));
  if(s.includeRm&&!s.rmCities.length)return 'Selecione ao menos um município para a RM.';
  if(new Set(cities.map(c=>`${c.uf}|${norm(c.city)}`)).size!==cities.length)return 'A RM não pode repetir municípios nem incluir a cidade principal.';
  if(s.includeRm&&s.rmCities.some(value=>!regionalOptions(s.uf,s.city,catalog).some(option=>option.value===`${location(value,s.uf).uf}|${location(value,s.uf).city}`)))return 'Há município fora do recorte regional da cidade principal.';
  if(cities.some(c=>!(catalog[c.uf]??[]).includes(c.city)))return 'Há município fora do catálogo autorizado.';
  return null;
}
export const selectionKey=(s:Selection)=>JSON.stringify({...s,entity:s.entity.trim(),rmCities:s.includeRm?[...s.rmCities].sort():[]});
export const periods=(p:Periodicity)=>Array.from({length:12/periodSize(p)},(_,i)=>({value:i+1,label:p==='monthly'?new Intl.DateTimeFormat('pt-BR',{month:'long',timeZone:'UTC'}).format(new Date(Date.UTC(2026,i,1))):`${i+1}º ${p==='quarterly'?'trimestre':'semestre'}`}));
export interface Preset {id:string;city:string;uf:string;entity:string;regional:'rm'|'pair'|'city';suggestions:string[];sourceId:string;evidence:string}
export const PRESETS:Preset[]=[
  {id:'uberlandia',city:'Uberlândia',uf:'MG',entity:'SINDUSCON-TAP',regional:'city',suggestions:[],sourceId:'1qO1ztgff1M9eRdPCUzkRp3UMPZuKGQTV',evidence:'Título e séries: Uberlândia; sem faixa RM local.'},
  {id:'rio',city:'Rio de Janeiro',uf:'RJ',entity:'ADEMI-RJ',regional:'city',suggestions:[],sourceId:'16dxFXoKUX6H_5Dd3mOU-QxBrnvKf84YQ',evidence:'Título e séries locais: Rio de Janeiro.'},
  {id:'curitiba',city:'Curitiba',uf:'PR',entity:'ADEMI-PR',regional:'rm',suggestions:['Almirante Tamandaré','Araucária','Campina Grande do Sul','Campo Largo','Campo Magro','Colombo','Fazenda Rio Grande','Pinhais','Piraquara','São José dos Pinhais'],sourceId:'1cLd59MFqyICd7A7j9B-ZcUhot0W3O-xl',evidence:'Curitiba/RM: dez municípios na Lista de cidades monitoradas (ADEMI-PR).'},
  {id:'joinville',city:'Joinville',uf:'SC',entity:'SINDUSCON Joinville',regional:'rm',suggestions:['Araquari'],sourceId:'16o5Hu3Zw_-nKPEFjZIlp7A8XQ9vj01Bu',evidence:'Capa Joinville/RM e quadros Joinville e Araquari; conferir outros municípios antes de incluir.'},
  {id:'niteroi',city:'Niterói',uf:'RJ',entity:'ADEMI Niterói',regional:'city',suggestions:[],sourceId:'1OzOxyn5vY7TliVjct3SSQHGvW3wY-_1C',evidence:'Original apresenta zonas Central, Sul e Oceânica de Niterói, não uma RM municipal.'},
  {id:'rio-verde',city:'Rio Verde',uf:'GO',entity:'ADEMI Rio Verde',regional:'city',suggestions:[],sourceId:'16JzAUEdKEzCtOCoYq8SbUo3AqAM9Y7bf',evidence:'Censo local Rio Verde. Menções a outras RMs pertencem ao bloco nacional.'},
  {id:'ponta-grossa',city:'Ponta Grossa',uf:'PR',entity:'Institucional',regional:'city',suggestions:[],sourceId:'12DWEzFOndhdEkZLX7xt0eEEHTLUU0v3G',evidence:'Título e séries locais: Ponta Grossa.'},
  {id:'blumenau',city:'Blumenau',uf:'SC',entity:'SINDUSCON Blumenau',regional:'city',suggestions:[],sourceId:'18B2avf7-yuEfVgvNTjNXgT1RFdwkDmoN',evidence:'Slide 4 identifica a cidade analisada: Blumenau.'},
  {id:'itajai',city:'Itajaí',uf:'SC',entity:'SINDUSCON Itajaí',regional:'pair',suggestions:['Navegantes'],sourceId:'10gBZV-s8Ol51GCvse0wCr8nDuzDpLT14',evidence:'Slide 7: Itajaí e Navegantes; conjunto de duas cidades, não toda a RM oficial.'},
  {id:'penha',city:'Penha',uf:'SC',entity:'SINDUSCON Itajaí',regional:'pair',suggestions:['Balneário Piçarras'],sourceId:'1Tl5LzHLRc8CNsMYmP1zqGkaN_Q-WJJPh',evidence:'Slide 8: Penha e Balneário Piçarras; conjunto de duas cidades.'},
  {id:'sao-luis',city:'São Luís',uf:'MA',entity:'SINDUSCON-MA',regional:'rm',suggestions:['São José de Ribamar','Paço do Lumiar','Raposa'],sourceId:'1nQ6Mhp2NySO8O5QShVptitr1MNMfggBu',evidence:'Mapa renderizado do slide 9 delimita São Luís, São José de Ribamar, Paço do Lumiar e Raposa.'},
  {id:'campo-grande',city:'Campo Grande',uf:'MS',entity:'SINDUSCON-MS',regional:'city',suggestions:[],sourceId:'1RzoIIlgB9gNOrQ5SWR4x3cjrNwtVxqfH',evidence:'Título e séries locais: Campo Grande.'},
  {id:'belem',city:'Belém',uf:'PA',entity:'SINDUSCON-PA',regional:'rm',suggestions:['Ananindeua','Marituba'],sourceId:'13wceyMoIYL96Rzu1R27zDQYKKTQ5-jer',evidence:'Slides 7–9 confirmam Belém, Ananindeua e Marituba.'},
  {id:'natal',city:'Natal',uf:'RN',entity:'SINDUSCON-RN',regional:'rm',suggestions:['Extremoz','São Gonçalo do Amarante','Macaíba','Parnamirim','Nísia Floresta'],sourceId:'1TXNxpbiSMZOewvUBxGHy2A_8SrwzCiWz',evidence:'Slide 8 nomeia Natal e os cinco municípios sugeridos.'},
  {id:'boa-vista',city:'Boa Vista',uf:'RR',entity:'SINDUSCON-RR',regional:'city',suggestions:[],sourceId:'1Kat9I4AxKCSEnwG_J9XCXSM8cQLrJ2f4',evidence:'Estudo de Boa Vista; nenhum conjunto RM local confirmado.'},
  {id:'teresina',city:'Teresina',uf:'PI',entity:'SINDUSCON Teresina',regional:'rm',suggestions:['Altos','Demerval Lobão','José de Freitas','União','MA|Timon'],sourceId:'12quCLgU77xHvtw19FN9kv9iIJOZNBvCl',evidence:'Teresina/RM: recorte monitorado SINDUSCON Teresina, incluindo Timon/MA; vínculo conferido na RIDE.'},
];

/** Study defaults come from the original decks and the monitored-cities workbook.
 * Geographic membership is curated separately: never infer it from UF alone.
 */
export const REGIONAL_SOURCE='https://docs.google.com/spreadsheets/d/1FGRGa_PB47CJwGBhww5owleHCp0b8pkE/edit';
const curitibaExtra=['Adrianópolis','Agudos do Sul','Balsa Nova','Bocaiúva do Sul','Campo do Tenente','Cerro Azul','Contenda','Doutor Ulysses','Itaperuçu','Lapa','Mandirituba','Piên','Quatro Barras','Rio Branco do Sul','Rio Negro','Quitandinha','Tijucas do Sul','Tunas do Paraná'];
export function regionalPreset(uf:string,city:string){return PRESETS.find(p=>p.regional!=='city'&&p.uf===uf&&norm(p.city)===norm(city));}
export function regionalOptions(uf:string,city:string,catalog:Record<string,string[]>|null){
 const p=regionalPreset(uf,city);if(!p)return [];
 // Legal RMC additionally permits authorized municipalities outside the monitored study default.
 const members=[...p.suggestions,...p.id==='curitiba'?curitibaExtra:[],...p.id==='belem'?['Castanhal']:[]];
 return members.flatMap(value=>{const l=location(value,p.uf),authorized=(catalog?.[l.uf]??[]).find(c=>norm(c)===norm(l.city));return authorized&&!(l.uf===uf&&norm(authorized)===norm(city))?[{value:`${l.uf}|${authorized}`,label:`${authorized} / ${l.uf}`}]:[];}).sort((a,b)=>a.label.localeCompare(b.label,'pt-BR'));
}
export function regionalDefaults(uf:string,city:string,catalog:Record<string,string[]>|null){
 const p=regionalPreset(uf,city),options=regionalOptions(uf,city,catalog);
 return options.filter(o=>p?.suggestions.some(v=>{const l=location(v,p.uf);return `${l.uf}|${norm(l.city)}`===`${location(o.value,uf).uf}|${norm(location(o.value,uf).city)}`;})).map(o=>o.value);
}
export function regionalMissing(uf:string,city:string,catalog:Record<string,string[]>|null){const p=regionalPreset(uf,city);return p?.suggestions.filter(v=>{const l=location(v,p.uf);return !(catalog?.[l.uf]??[]).some(c=>norm(c)===norm(l.city));}).map(v=>rmLabel(v,p.uf))??[];}
