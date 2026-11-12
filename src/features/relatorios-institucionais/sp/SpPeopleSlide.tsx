import { SP_INSTITUTIONAL_ASSETS } from './institutional-assets';
import { createSpPeople,SP_PEOPLE_RECTS,type SpPeople } from './people';
import { SP_CONSULTING_PHOTOS, SP_TEAM_PHOTOS, SP_FABIO_CROP } from './people-assets';
const p=(value:number)=>value*4/3;
function lines(value:string,width:number):string[] {
  return value.split('\n').flatMap(line=>{const result=[''];for(const word of line.split(/\s+/)){if(result.at(-1)!.length+word.length+1>width&&result.at(-1))result.push('');result[result.length-1]+=(result.at(-1)?' ':'')+word;}return result;});
}
export function SpPeopleSlide({page,people=createSpPeople()}:{page:82|83;people?:SpPeople}) {
  const group=page===82?'team':'consulting',rects=SP_PEOPLE_RECTS[group];
  return <>
    <img src={SP_INSTITUTIONAL_ASSETS[page]} alt="Arte institucional Brain" className="absolute inset-0 h-full w-full"/>
    <svg viewBox="0 0 1280 720" className="absolute inset-0 h-full w-full" aria-hidden="true">
      {page===82?<><rect width="1280" height="650" fill="#f8f8f8"/><text x={p(107)} y={p(65)} fontSize={p(28)} fontWeight="bold" fill="#405528">EQUIPE TÉCNICA</text></>:<><rect width={p(906)} height="720" rx={p(28)} fill="#f2f2f2"/><rect x={p(77)} y={p(75)} width={p(192)} height={p(41)} rx={p(21)} fill="#ffcf00"/><text x={p(100)} y={p(103)} fontSize={p(22)} fontWeight="bold" fill="#5b7638">CONSULTORIA</text></>}
    </svg>
    {people[group].map((person,index)=>{
      const [x,y,w,h]=rects[index];if(!person.visible)return null;
      const crop=SP_FABIO_CROP;
      return <div key={index} aria-hidden="true" data-sp-editable-photo={person.name} className="absolute overflow-hidden rounded-xl bg-muted" style={{left:`${x/9.6}%`,top:`${y/5.4}%`,width:`${w/9.6}%`,height:`${h/5.4}%`}}>
        {person.photo===null?<svg viewBox="0 0 100 100" className="h-full w-full"><rect width="100" height="100" fill="#e4e8df"/><circle cx="50" cy="34" r="17" fill="#8b9b75"/><path d="M15 96V82a35 35 0 0 1 70 0v14Z" fill="#8b9b75"/></svg>:person.photo?<img src={person.photo} alt={`Foto de ${person.name}`} className="h-full w-full object-cover"/>:page===82?<img src={SP_TEAM_PHOTOS[index]} alt={`Foto de referência de ${person.name}`} className="h-full w-full object-cover" style={index===0?{position:'absolute',maxWidth:'none',width:`${100/(1-crop.left-crop.right)}%`,height:`${100/(1-crop.top-crop.bottom)}%`,left:`${-crop.left/(1-crop.left-crop.right)*100}%`,top:`${-crop.top/(1-crop.top-crop.bottom)*100}%`}:undefined}/>:<img src={SP_CONSULTING_PHOTOS} alt={`Foto de referência de ${person.name}`} style={{position:'absolute',maxWidth:'none',width:`${960/w*100}%`,height:`${540/h*100}%`,left:`${-x/w*100}%`,top:`${-y/h*100}%`}}/>}
      </div>;
    })}
    <svg role="img" aria-label={page===82?'Equipe técnica personalizada':'Consultoria personalizada'} viewBox="0 0 1280 720" className="pointer-events-none absolute inset-0 h-full w-full" style={{fontFamily:'Tahoma, sans-serif'}}>
      {people[group].map((person,index)=>{
        const [x,y,w,h]=rects[index];if(!person.visible)return null;
        const names=lines(person.name,page===82?28:19),roles=lines(person.role,page===82?31:29),available=page===82?(index<3?58:55):(index<3?38:58),step=Math.min(page===82?16:12,available/Math.max(1,names.length+roles.length)),size=Math.min(page===82?14:11.4,step-1),padding=page===82?23:14;
        return <g key={index}>{names.map((line,i)=><text key={`n${i}`} x={p(x+w/2)} y={p(y+h+padding+i*step)} textAnchor="middle" fontSize={p(size)} fontWeight="bold" fill="#262626">{line}</text>)}{roles.map((line,i)=><text key={`r${i}`} x={p(x+w/2)} y={p(y+h+padding+(names.length+i)*step)} textAnchor="middle" fontSize={p(size-0.5)} fill="#555555">{line}</text>)}</g>;
      })}
    </svg>
  </>;
}
