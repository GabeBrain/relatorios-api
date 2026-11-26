/** Legend classes of the originals (variation of each UF between equivalent windows). */
export const VARIATION_CLASSES=[
 {label:'Acima de 10%',color:'#7aa83c',test:(v:number)=>v>10},
 {label:'5% a 10%',color:'#c5e0b3',test:(v:number)=>v>5&&v<=10},
 {label:'0 a 5%',color:'#a6a6a6',test:(v:number)=>v>=0&&v<=5},
 {label:'0 a -5%',color:'#d9d9d9',test:(v:number)=>v<0&&v>=-5},
 {label:'-5% a -10%',color:'#ff7070',test:(v:number)=>v<-5&&v>=-10},
 {label:'Abaixo de -10%',color:'#c00000',test:(v:number)=>v<-10},
] as const;
export const NO_BASE='#f2f2f2';
export const variationColor=(v:number|null)=>v===null?NO_BASE:VARIATION_CLASSES.find(c=>c.test(Math.round(v*10)/10))?.color??NO_BASE;

