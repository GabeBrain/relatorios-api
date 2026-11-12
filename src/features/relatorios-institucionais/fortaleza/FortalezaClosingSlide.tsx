import { FortalezaArtwork } from './FortalezaArtwork';
import { closingLines,type FortalezaEditorial } from './monthly-closing';
import type { FortalezaSelection } from './model';
import { introMonth } from './intro-view';
const quarterlyArtwork=import.meta.glob('./assets/quarterly/*.png',{eager:true,import:'default',query:'?url'}) as Record<string,string>;
const artwork=import.meta.glob('./assets/monthly/*.png',{eager:true,import:'default',query:'?url'}) as Record<string,string>;
export default function FortalezaClosingSlide({page,selection,editorial,originalPage}:{page:number;selection:FortalezaSelection;editorial:FortalezaEditorial;originalPage?:number}){
  const people=page===57?editorial.brain:page===58?editorial.sinduscon:[];
  return <svg className="fortaleza-intro-slide block aspect-video h-auto w-full" viewBox="0 0 1280 720" role="img" aria-label={`Fortaleza · slide ${originalPage??page}`}>
    {page===59&&editorial.board?<image href={editorial.board} width={1280} height={720}/>:<FortalezaArtwork href={originalPage?quarterlyArtwork[`./assets/quarterly/${originalPage}.png`]:artwork[`./assets/monthly/${page}.png`]} kind={originalPage?"quarterly":"monthly"} page={originalPage??page}/>}
    {[56,60].includes(page)&&<text x={1200} y={page===60?690:580} textAnchor="end" fontSize={18} fill="white">{selection.periodicity==='quarterly'?`${selection.position}º trimestre`:introMonth(selection.position)} de {selection.year}</text>}
    {people.map((person,index)=>{
      if(!person.visible)return null;const x=60+(index%3)*260,top=page===57?(index<3?28:365):170;
      const names=closingLines(person.name,23,2),roles=closingLines(person.role,25),longest=Math.max(...names.map(line=>line.length),1),roleMax=Math.max(...roles.map(line=>line.length),1);
      return <g key={index} aria-label={`Integrante ${index+1}`}><rect x={x} y={top+105} width={220} height={190} rx={28} fill="#F2F2F2"/>
        <defs><clipPath id={`fort-person-${page}-${index}`}><rect x={x+20} y={top} width={180} height={180} rx={20}/></clipPath></defs>
        {person.photo?<svg data-fortaleza-editable-photo={person.name} x={x+20} y={top} width={180} height={180} viewBox="0 0 180 180"><defs><clipPath id={`fort-portrait-${page}-${index}`}><rect width={180} height={180} rx={20}/></clipPath></defs><image href={person.photo} width={180} height={180} preserveAspectRatio="xMidYMid slice" clipPath={`url(#fort-portrait-${page}-${index})`}/></svg>:<rect x={x+20} y={top} width={180} height={180} rx={20} fill="#D9DEE1"/>}
        {names.map((line,lineIndex)=><text key={lineIndex} x={x+110} y={top+207+lineIndex*20} textAnchor="middle" fontSize={Math.min(19,205/(longest*.62))} fontWeight={700}>{line}</text>)}
        {roles.map((line,lineIndex)=><text key={lineIndex} x={x+110} y={top+232+(names.length-1)*20+lineIndex*19} textAnchor="middle" fontSize={Math.min(17,205/(roleMax*.6),roles.length>2?15:17)}>{line}</text>)}
      </g>;
    })}
  </svg>;
}
