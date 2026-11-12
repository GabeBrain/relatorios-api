import { availableEndQuarters, quarterOfDate, shiftQuarter } from '@/features/panorama-secovi-fiergs/domain/quarters';
import type { Quarter } from '@/features/panorama-secovi-fiergs/types';
import type { SpPreview } from './model';
import { priorMonth, quarterMonths } from './temporal';
import { shiftSpMonth } from './project-trends';

function calendarDate(reference:Date) {
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(reference);
  const value=(type:string)=>Number(parts.find(part=>part.type===type)!.value);
  return new Date(Date.UTC(value('year'),value('month')-1,value('day'),12));
}
export function spPeriodOptions(reference=new Date()) {
  const quarters=availableEndQuarters('1T2021',calendarDate(reference));
  return {quarters,years:[...new Set(quarters.map(q=>q.slice(2)))].reverse()};
}
export function spDefaultQuarter(reference=new Date()):Quarter {
  const previous=shiftQuarter(quarterOfDate(calendarDate(reference)),-1),options=spPeriodOptions(reference).quarters;
  return options.includes(previous)?previous:options[options.length-1];
}
export function spQuarterInYear(quarter:Quarter,year:string,reference=new Date()):Quarter {
  const options=spPeriodOptions(reference).quarters.filter(q=>q.slice(2)===year);
  const candidate=`${quarter[0]}T${year}` as Quarter;
  return options.includes(candidate)?candidate:options[options.length-1];
}
/** Cover every editorial quarter, its opening stock and all 12-month comparisons. */
export function spHistoryStartMonth(report:Pick<SpPreview,'quarter'|'throughMonth'>,openingStock=false):string {
  const first=quarterMonths(shiftQuarter(report.quarter,-16))[0];
  return ['2021-01',openingStock?priorMonth(first):first,shiftSpMonth(report.throughMonth!,-47)].sort()[0];
}
export function spHistoryWindows(report:Pick<SpPreview,'quarter'|'throughMonth'>,openingStock=false) {
  const windows:{start:string;end:string}[]=[];
  for(let start=spHistoryStartMonth(report,openingStock);start<=report.throughMonth!;){
    const end=[`${start.slice(0,4)}-12`,report.throughMonth!].sort()[0];
    windows.push({start,end});start=shiftSpMonth(end,1);
  }
  return windows;
}
