/** Text measurement shared by slide layout. Uses the browser font engine when available. */
let context:CanvasRenderingContext2D|null|undefined;
const canvas=()=>{
 if(context!==undefined)return context;
 try{context=typeof document!=='undefined'&&typeof navigator!=='undefined'&&!/jsdom/i.test(navigator.userAgent)?document.createElement('canvas').getContext('2d'):null;}catch{context=null;}
 return context;
};
export function textWidth(text:string,size:number,bold=false){
 const ctx=canvas();
 if(ctx){ctx.font=`${bold?'700 ':''}${size}px Arial, sans-serif`;return ctx.measureText(text).width;}
 // Conservative estimate (Arial metrics, uppercase-heavy titles are wider).
 const upper=[...text].filter(c=>c!==c.toLowerCase()).length/Math.max(1,text.length);
 return text.length*size*((bold?.58:.52)+upper*.12);
}
/** Greedy word wrap by rendered width; a single long word stays on its own line. */
export function wrapByWidth(text:string,size:number,maxWidth:number,bold=false){
 const lines:string[]=[];
 for(const word of text.split(/\s+/).filter(Boolean)){
  const candidate=lines.length?`${lines.at(-1)} ${word}`:word;
  if(lines.length&&textWidth(candidate,size,bold)<=maxWidth)lines[lines.length-1]=candidate;else lines.push(word);
 }
 return lines;
}
/** Readable label colour over a filled shape. */
export function contrastText(fill:string,dark='#273f1c'){
 const hex=fill.replace('#','');if(hex.length!==6)return dark;
 const [r,g,b]=[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.03928?v/12.92:((v+.055)/1.055)**2.4);
 return .2126*r+.7152*g+.0722*b<.42?'#ffffff':dark;
}
