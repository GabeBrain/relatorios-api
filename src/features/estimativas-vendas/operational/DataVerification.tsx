import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogTitle,DialogDescription,DialogTrigger} from '@/components/ui/dialog';
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from '@/components/ui/select';
import {SupportPanels} from '../expanded/SupportPanels';
import type {SourceType} from '../source';
import type {LocatedBuilding} from './workbench';
export function DataVerification({source,fetchedAt}:{source:LocatedBuilding[];fetchedAt:string}) {
  const groups=[...new Set(source.map(x=>JSON.stringify([x.uf,x.city,x.building.sourceType])))];
  const [selected,setSelected]=useState(groups[0]??'');
  const active=groups.includes(selected)?selected:groups[0];
  const [uf,city,type]=active?JSON.parse(active) as [string,string,SourceType]:['','','Horizontal' as SourceType];
  const buildings=source.filter(x=>x.uf===uf&&x.city===city&&x.building.sourceType===type).map(x=>x.building);
  return <Dialog><DialogTrigger asChild><Button variant="outline" disabled={!groups.length}>Dados e conferência</Button></DialogTrigger><DialogContent className="ev-modal"><DialogTitle>Conferir os dados de entrada</DialogTitle><DialogDescription>A conferência usa o histórico já carregado. O Excel de Análise Temporal confere valores; não define a origem de coleta nem o contrato de importação.</DialogDescription><label className="grid gap-2 text-sm">Recorte a conferir<Select value={active} onValueChange={setSelected}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{groups.map(key=><SelectItem key={key} value={key}>{(JSON.parse(key) as string[]).join(' · ')}</SelectItem>)}</SelectContent></Select></label><SupportPanels key={active} showLaboratory={false} city={city} type={type} data={{buildings,pages:0,fetchedAt}}/></DialogContent></Dialog>;
}
