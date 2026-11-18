interface StaticText {text:string;x:number;y:number;size:number;bold:boolean;italic:boolean;color:string}
const sources=import.meta.glob('./assets/**/static-text.json',{eager:true,import:'default'}) as Record<string,Record<string,StaticText[]|StaticText>>;
/** Native source text is removed from the bitmap and drawn once in the editable layer. */
export function FortalezaArtwork({href,kind,page,omitText=false}:{href:string;kind:'monthly'|'quarterly'|'intro';page:number|string;omitText?:boolean}){
 const source=sources[`./assets/${kind}/static-text.json`]?.[String(page)]??[];
 const lines=omitText?[]:Array.isArray(source)?source:[source];
 return <><image href={href} width={1280} height={720} aria-hidden="true"/>{lines.map((line,index)=><text key={index} x={line.x} y={Math.max(0,line.y)} dominantBaseline="text-before-edge" fontFamily="Tahoma" fontSize={line.size} fontWeight={line.bold?700:400} fontStyle={line.italic?'italic':undefined} fill={line.color}>{[...line.text].filter(char=>char.charCodeAt(0)>=32).join('')}</text>)}</>;
}
