import type { FortalezaSlideProps } from './FortalezaReportSlide';
import FortalezaQuarterlyLaunchSlide from './FortalezaQuarterlyLaunchSlide';
import FortalezaQuarterlyDetailSlide from './FortalezaQuarterlyDetailSlide';
import FortalezaMonthlyAnalysisSlide from './FortalezaMonthlyAnalysisSlide';
import FortalezaClosingSlide from './FortalezaClosingSlide';
import { buildQuarterlyPrice,buildQuarterlyIvv,QUARTERLY_PRICE_PAGES } from './quarterly-analysis';
export default function FortalezaQuarterlyReportSlide(props:FortalezaSlideProps&{page:number}){
  const {page,selection,cities,monthlyLaunches,editorial}=props;
  if(page<=40)return <FortalezaQuarterlyLaunchSlide {...props}/>;
  if(page>=85)return <FortalezaClosingSlide page={page-29} originalPage={page} selection={selection} editorial={editorial}/>;
  if([41,44,65,70,80].includes(page))return <FortalezaMonthlyAnalysisSlide page={36} originalPage={page} selection={selection} data={null}/>;
  if(QUARTERLY_PRICE_PAGES[page])return <FortalezaMonthlyAnalysisSlide page={QUARTERLY_PRICE_PAGES[page]} originalPage={page} selection={selection} data={buildQuarterlyPrice(page,monthlyLaunches?.prices??null,selection,cities)}/>;
  if(page===54||page===72)return <FortalezaMonthlyAnalysisSlide page={45} originalPage={page} selection={selection} data={buildQuarterlyIvv(monthlyLaunches?.market??null,selection,cities,page===72)}/>;
  return <FortalezaQuarterlyDetailSlide {...props}/>;
}
