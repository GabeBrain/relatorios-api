// Invented histories for browser QA only. No market prices or project-level observations.
export function spGranularFixture(groups, values, throughMonth) {
  const months=[]; for(let year=2021;year<=Number(throughMonth.slice(0,4));year++) for(let m=1;m<=12;m++) { const month=`${year}-${String(m).padStart(2,'0')}`; if(month<=throughMonth) months.push(month); }
  const split=total=>{const first=[.1,.2,.3].map(weight=>Math.floor(total*weight));return [...first,total-first.reduce((a,b)=>a+b,0)];};
  const current=months.filter(month=>month>='2026-07'), buildings=[];
  groups.forEach((standard,i)=>{
    const rows=(month,stock,sales,qty)=>[1,2,3,4].map((bedroom,b)=>{const area=[30,37,65,120][b],meter=5000+['Compacto','Econômico','Standard','Médio','Médio-Alto','Alto','Luxo'].indexOf(standard)*1000+bedroom*300+(Number(month.slice(0,4))-2021)*120+Number(month.slice(5))*10;return {typology_id:i*100+bedroom,period:`${month}-01`,number_bedroom:bedroom,private_area:area,typology_stock:split(stock)[b],sold_in_period:split(sales)[b],qty:qty[b],price:meter*area,price_private_area:meter};});
    const base={city:'São Paulo',state:'SP',building_type:'Vertical',standard,neighborhood:`Bairro ${i+1}`,period:'2026-08-01'};
    buildings.push({...base,building_id:i+1,release_date:'2020-01-01',typologies_history:months.flatMap(month=>rows(month,values('stock',month,i),values('sales',month,i),[100000,100000,100000,100000]))});
    current.forEach((month,index)=>buildings.push({...base,building_id:100+i*3+index,release_date:`${month}-01`,typologies_history:months.filter(value=>value>=month).flatMap(value=>rows(value,0,0,split(values('releases',month,i))))}));
  });
  return buildings;
}
