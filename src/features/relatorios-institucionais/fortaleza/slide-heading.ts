import monthlyText from './assets/monthly/static-text.json';
import quarterlyText from './assets/quarterly/static-text.json';

/** Keep the source title and scope, with space reserved before data starts. */
export function fortalezaSlideHeading(kind:'monthly'|'quarterly',page:number){
  const source=(kind==='monthly'?monthlyText:quarterlyText) as Record<string,{text:string;bold:boolean;y:number}[]>;
  const clean=(text:string)=>[...text].map(char=>char.charCodeAt(0)<32?' ':char).join('').trim();
  const header=(source[String(page)]??[]).filter(line=>line.y<250);
  const words=header.filter(line=>line.bold).map(line=>clean(line.text)).join(' ').split(/\s+/),lines:string[]=[];
  for(const word of words){if(!lines.length||`${lines.at(-1)} ${word}`.length>40)lines.push(word);else lines[lines.length-1]+=` ${word}`;}
  return {lines,scope:header.filter(line=>!line.bold).map(line=>clean(line.text)).join(' '),periodY:Math.max(170,26+lines.length*44+42)};
}
