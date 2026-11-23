import{it,expect}from'vitest';
import{maceioPeriodIsClosed}from'./model';
it('aceita qualquer período encerrado e impede mês/trimestre em curso ou futuro',()=>{
 const now=new Date('2026-11-23T15:00:00Z');
 for(let year=2021;year<=2026;year++)for(let month=1;month<=12;month++)expect(maceioPeriodIsClosed({periodicity:'monthly',year,position:month},now)).toBe(year<2026||month<11);
 for(let year=2021;year<=2026;year++)for(let quarter=1;quarter<=4;quarter++)expect(maceioPeriodIsClosed({periodicity:'quarterly',year,position:quarter},now)).toBe(year<2026||quarter<4);
 expect(maceioPeriodIsClosed({periodicity:'monthly',year:2027,position:1},now)).toBe(false);
});
it('só libera o fechamento após a virada do mês em São Paulo',()=>{
 const period={periodicity:'monthly' as const,year:2026,position:11};
 expect(maceioPeriodIsClosed(period,new Date('2026-12-01T02:59:59Z'))).toBe(false);
 expect(maceioPeriodIsClosed(period,new Date('2026-12-01T03:00:00Z'))).toBe(true);
 expect(maceioPeriodIsClosed({periodicity:'quarterly',year:2026,position:4},new Date('2027-01-01T03:00:00Z'))).toBe(true);
});
