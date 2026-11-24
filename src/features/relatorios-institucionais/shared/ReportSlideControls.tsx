import type {ReactNode} from 'react';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogDescription,DialogTitle} from '@/components/ui/dialog';

export interface ReportSlideOption {number:number;title:string}
/** Maceió's numeric controls are the common report-shell contract. */
export function ReportSlideNavigation({slides,value,onChange,label='Navegação dos slides'}:{slides:readonly ReportSlideOption[];value:number;onChange:(page:number)=>void;label?:string}){
 const index=slides.findIndex(s=>s.number===value);
 return <nav className="flex flex-wrap gap-2" aria-label={label}><Button variant="outline" disabled={index<=0} onClick={()=>onChange(slides[index-1].number)}>Anterior</Button>{slides.map(slide=><Button key={slide.number} title={`Slide ${slide.number} · ${slide.title}`} variant={value===slide.number?'default':'outline'} aria-pressed={value===slide.number} aria-current={value===slide.number?'page':undefined} onClick={()=>onChange(slide.number)}>{slide.number}</Button>)}<Button variant="outline" disabled={index<0||index>=slides.length-1} onClick={()=>onChange(slides[index+1].number)}>Próximo</Button></nav>;
}
export function ReportSlideHeading({page,title,onExpand}:{page:number;title:string;onExpand:()=>void}){
 return <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-medium">Slide {page} · {title}</p><Button variant="outline" onClick={onExpand}>Ampliar slides</Button></div>;
}
export function ReportSlideDialog({open,onOpenChange,title,description,navigation,children}:{open:boolean;onOpenChange:(open:boolean)=>void;title:string;description:ReactNode;navigation:ReactNode;children:ReactNode}){
 return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[95dvh] w-[96vw] max-w-7xl overflow-auto"><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription>{navigation}{children}</DialogContent></Dialog>;
}
