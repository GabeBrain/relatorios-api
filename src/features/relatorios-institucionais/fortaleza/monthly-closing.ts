import {createFortalezaConsulting} from './consulting';
export interface FortalezaPerson { name:string; role:string; photo:string|null; visible:boolean }
export interface FortalezaEditorial { brain:FortalezaPerson[]; sinduscon:FortalezaPerson[]; consulting:FortalezaPerson[] }
const portraits=import.meta.glob('./assets/monthly/people/*.png',{eager:true,import:'default',query:'?url'}) as Record<string,string>;
const people=(page:number,rows:string[][])=>rows.map(([name,role],index)=>({name,role,photo:portraits[`./assets/monthly/people/${page}-${index}.png`],visible:true}));
export const createFortalezaEditorial=():FortalezaEditorial=>({
  brain:people(57,[['Fábio Tadeu Araújo','CEO'],['Marcos Kahtalian','Sócio-fundador'],['Teresa Cristina','Sócia e Gestora de Projetos'],['Enzo Coelho','Inteligência de Mercado'],['Mariana Andretta','Inteligência de Mercado'],['Lucas Finoti','Inteligência de Mercado']]),
  sinduscon:people(58,[['Sergio Macedo','Presidente da Comissão de Pesquisas'],['Lucas Araujo','Analista de Pesquisa'],['Cássia Liliane','Coordenadora de Projetos']]),consulting:createFortalezaConsulting(),
});
export async function readFortalezaPhoto(file:File):Promise<string>{
  if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw new Error('Use uma imagem PNG, JPG ou WebP.');
  if(!file.size||file.size>2*1024*1024)throw new Error('A imagem deve ter conteúdo e no máximo2 MB.');
  const value=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('Não foi possível ler a imagem.'));reader.readAsDataURL(file);});
  const image=new Image();image.src=value;await image.decode().catch(()=>{throw new Error('O arquivo não contém uma imagem válida.');});
  if(!image.naturalWidth||!image.naturalHeight)throw new Error('Imagem vazia.');return value;
}
export function closingLines(text:string,width=24,maxLines=3){
  const words=text.trim().split(/\s+/),lines:string[]=[];
  for(const word of words){const last=lines.at(-1);if(last&&last.length+word.length+1<=width)lines[lines.length-1]=`${last} ${word}`;else lines.push(word);}
  return lines.length>maxLines?[...lines.slice(0,maxLines-1),lines.slice(maxLines-1).join(' ')]:lines;
}
