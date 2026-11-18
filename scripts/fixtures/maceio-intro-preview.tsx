import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import MaceioIntroSlides from '../../src/features/relatorios-institucionais/maceio/MaceioIntroSlides';
import {introFixture} from '../../src/features/relatorios-institucionais/maceio/__tests__/intro-fixture';
import {remainingFixture} from '../../src/features/relatorios-institucionais/maceio/__tests__/remaining-fixture';
import type {MaceioSelection} from '../../src/features/relatorios-institucionais/maceio/model';
import '../../src/index.css';
export default function Preview(){const[quarterly,setQuarterly]=useState(false),[missing,setMissing]=useState(false);const selection:MaceioSelection={uf:'AL',city:'Maceió',territory:'capital-rm',periodicity:quarterly?'quarterly':'monthly',year:2026,position:quarterly?2:5};return <main className="bg-background p-4 text-foreground"><button onClick={()=>setQuarterly(!quarterly)}>Trocar modelo</button><button onClick={()=>setMissing(!missing)}>Trocar fonte</button><MaceioIntroSlides key={selection.periodicity} selection={selection} initialMonetaryPolicy="INCC-DI" initialPricePolicy="stock-weighted" data={missing?null:{...introFixture(selection),slides:remainingFixture(selection)}}/></main>;}
createRoot(document.getElementById('root')!).render(<Preview/>);
