import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import '../../src/index.css';
import MaceioIntroSlides from '../../src/features/relatorios-institucionais/maceio/MaceioIntroSlides';
import {cagedFixture} from '../../src/features/relatorios-institucionais/maceio/__tests__/caged-fixture';
import type {MaceioSelection} from '../../src/features/relatorios-institucionais/maceio/model';
export default function Preview(){
 const[quarterly,setQuarterly]=useState(false),[state,setState]=useState('success');
 const selection:MaceioSelection={uf:'AL',city:'Maceió',territory:'capital-rm',periodicity:quarterly?'quarterly':'monthly',year:2026,position:quarterly?2:5};
 const report=cagedFixture(quarterly?'2026-06':'2026-05','2017-01',true);if(state==='empty'){report.rows=[];report.completePeriods=[];}
 return <main className="bg-background p-4 text-foreground"><button onClick={()=>setQuarterly(!quarterly)}>Trocar modelo</button>{['success','empty','error'].map(value=><button key={value} onClick={()=>setState(value)}>{value}</button>)}<MaceioIntroSlides key={selection.periodicity} selection={selection} data={{cities:[],collectedAt:'2026-11-17T12:00:00Z',caged:state==='error'?{report:null,issue:'Não foi possível consultar o CAGED. Tente novamente.'}:{report,issue:null}}}/></main>;
}
createRoot(document.getElementById('root')!).render(<Preview/>);
