import { FORTALEZA_CITIES,type FortalezaSelection } from './model';
import type { IntroData } from './intro-data';
import type { MonthlyLaunchData } from './monthly-launches';
import { monthlyProjectLaunches,monthlyUnitLaunches } from './monthly-launches';
import { buildIntroView } from './intro-view';
import { buildMonthlySlide } from './monthly-market';
import { buildPriceSlide } from './monthly-prices';
import { buildMonthlyIvv } from './monthly-ivv';
import { buildOfferTable } from './monthly-tables';
import type { FortalezaEditorial } from './monthly-closing';
import FortalezaIntroSlide from './FortalezaIntroSlide';
import FortalezaClosingSlide from './FortalezaClosingSlide';
import FortalezaMonthlyTableSlide from './FortalezaMonthlyTableSlide';
import FortalezaMonthlyAnalysisSlide from './FortalezaMonthlyAnalysisSlide';
import FortalezaMonthlyMarketSlide from './FortalezaMonthlyMarketSlide';
import FortalezaMonthlyLaunchSlide from './FortalezaMonthlyLaunchSlide';
import FortalezaQuarterlyLaunchSlide from './FortalezaQuarterlyLaunchSlide';

export interface FortalezaSlideProps {
  selection:FortalezaSelection; cities:string[]; data:IntroData|null;
  monthlyLaunches:MonthlyLaunchData|null; editorial:FortalezaEditorial;
}
/** Preview and exports share exactly the same slide, including edited people. */
export default function FortalezaReportSlide({page,...props}:FortalezaSlideProps&{page:number}) {
  const {selection,cities,data,monthlyLaunches,editorial}=props;
  if(selection.periodicity!=='monthly')return page>=11?<FortalezaQuarterlyLaunchSlide page={page} {...props}/>:<FortalezaIntroSlide model="junho" page={page} view={buildIntroView(selection,cities.length?cities:[...FORTALEZA_CITIES],data)}/>;
  if(page>=56)return <FortalezaClosingSlide page={page} selection={selection} editorial={editorial}/>;
  if(page>=47)return <FortalezaMonthlyTableSlide page={page} selection={selection} data={buildOfferTable(Math.min(page,52),monthlyLaunches?.market??null,monthlyLaunches?.prices??null,selection,cities)}/>;
  if(page>=36){
    const analysis=[36,39,44].includes(page)?null:page>=45?buildMonthlyIvv(monthlyLaunches?.market??null,selection,cities,page===46):buildPriceSlide(page,monthlyLaunches?.prices??null,selection,cities);
    return <FortalezaMonthlyAnalysisSlide page={page} selection={selection} data={analysis}/>;
  }
  if(page===12||page===14||page>=16)return <FortalezaMonthlyMarketSlide page={page} selection={selection} cities={cities} data={[18,21,29,32].includes(page)?null:buildMonthlySlide(page,monthlyLaunches?.market??null,selection,cities)}/>;
  if(page===11||page===13||page===15)return <FortalezaMonthlyLaunchSlide page={page} selection={selection} series={page===11?monthlyProjectLaunches(data,selection,cities):monthlyUnitLaunches(monthlyLaunches,selection,cities,page===13?'capital':'rm')}/>;
  return <FortalezaIntroSlide model="julho" page={page} view={buildIntroView(selection,cities.length?cities:[...FORTALEZA_CITIES],data)}/>;
}
