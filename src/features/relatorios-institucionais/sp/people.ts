export interface SpPerson {name:string;role:string;photo?:string|null;visible:boolean}
export interface SpPeople {team:SpPerson[];consulting:SpPerson[]}
export type SpPeopleGroup=keyof SpPeople;
const team=[['Fábio Tadeu Araújo','CEO'],['Marcos Kahtalian','Sócio-Fundador'],['Teresa Cristina','Sócia e Gestora de Projetos'],['Mariana Andretta','Inteligência\nde Mercado'],['Lucas Finoti','Inteligência\nde Mercado']];
const consulting=[['Marcos Kahtalian','Fundador'],['Fábio Tadeu Araújo','CEO'],['Leticia Tiboni','Vice-Presidente'],['Anderson Gonçalves','Head Centro-Oeste\ne Norte'],['Andressa Bergamo','Sócia e Gestora\nde Comunicação'],['Angela Negrão','Gestora de Pesquisas\nQuantitativas'],['Antônio Kahtalian','Head Nordeste'],['Diogo Cabrero','Head Geobrain'],['Gisele Pereira','Sócia e Especialista de\nInteligência de Mercado'],['Guilherme Werner','Sócio-Consultor'],['Hamilton Leite','Head São Paulo'],['Lucas Finoti','Sócio e Especialista de\nInteligência de Mercado'],['Marcelo Gonçalves','Sócio-Consultor'],['Shirlei Camargo','Gestora de Pesquisas\nQualitativas'],['Teresa Cristina','Sócia e Gestora\nde Projetos']];
export const createSpPeople=():SpPeople=>({team:team.map(([name,role])=>({name,role,visible:true})),consulting:consulting.map(([name,role])=>({name,role,visible:true}))});
/** Rectangles of the portraits in the supplied reference artwork (960×540). */
export const SP_PEOPLE_RECTS={team:[[107,86,136,137],[417,97,136,136],[697,100,137,138],[239,299,126,124],[558,299,125,126]],consulting:[[490,29,111,112],[616,29,111,112],[751,29,110,112],[77,184,110,110],[213,184,111,110],[350,184,113,110],[485,184,111,110],[615,184,110,110],[749,184,111,110],[76,356,111,110],[211,356,112,110],[350,356,110,110],[489,356,110,110],[614,356,111,110],[749,356,111,110]]} as const;
export const MAX_SP_PHOTO_BYTES=2*1024*1024;
export function validateSpPhoto(file:File):string|null {
  if(!['image/png','image/jpeg','image/webp'].includes(file.type))return 'Selecione uma foto PNG, JPG ou WebP.';
  if(file.size>MAX_SP_PHOTO_BYTES)return 'A foto deve ter até 2 MB.';
  return null;
}
export async function readSpPhoto(file:File):Promise<string> {
  const invalid=validateSpPhoto(file);if(invalid)throw new Error(invalid);
  const data=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('Não foi possível ler a foto.'));reader.readAsDataURL(file);});
  const image=new Image();image.src=data;await image.decode().catch(()=>{throw new Error('O arquivo não contém uma imagem válida.');});
  if(!image.naturalWidth||!image.naturalHeight)throw new Error('A imagem está vazia.');
  return data;
}
