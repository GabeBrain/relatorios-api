import type { FortalezaSlideProps } from './FortalezaReportSlide';
import { FORTALEZA_CITIES } from './model';
import { introMonth } from './intro-view';
import { buildQuarterlyLaunchSlide,buildQuarterlyMunicipalTable } from './quarterly-launches';
import { Plot } from './FortalezaMonthlyMarketSlide';
import layouts from './assets/quarterly/layout.json';
const artwork=import.meta.glob('./assets/quarterly/*.png',{eager:true,import:'default',query:'?url'}) as Record<string,string>;
const percentage=(value:number|null)=>value===null?'—':`${value>0?'+':''}${value.toLocaleString('pt-BR',{maximumFractionDigits:1})}%`;
export default function FortalezaQuarterlyLaunchSlide({page,selection,cities,data,monthlyLaunches}:FortalezaSlideProps&{page:number}){
  const table=[16,19].includes(page)?buildQuarterlyMunicipalTable(page,monthlyLaunches?.market??null,selection,cities):null;
  const chart=page===20||table?null:buildQuarterlyLaunchSlide(page,monthlyLaunches?.market??null,data,selection,cities);
  const endMonth=selection.position*3,layout=layouts.find(item=>item.page===page),scope=layout?.scope;
  return <svg className="fortaleza-intro-slide block aspect-video h-auto w-full" viewBox="0 0 1280 720" role="img" aria-label={`Fortaleza · slide ${page}`}>
    <image href={artwork[`./assets/quarterly/${page}.png`]} width={1280} height={720} aria-hidden="true"/>
    {page===20?<><text x={1180} y={scope?scope.y+30:330} textAnchor="end" fill="white" fontSize={22}>{cities.join(', ')}</text><text x={1180} y={410} textAnchor="end" fill="white" fontSize={22}>{selection.position}º trimestre de {selection.year}</text></>:table?<>
      <text x={53} y={59} fill="#1B4059" fontSize={31} fontWeight={700}>{page===16?'UNIDADES LANÇADAS POR MUNICÍPIO':'VGV UNIDADES LANÇADAS POR MUNICÍPIO'}</text>
      <text x={53} y={88} fill="#1B4059" fontSize={26}>{introMonth(endMonth)} / {selection.year}{page===19?' · R$ milhões nominais':''}</text>
      {table.status==='ready'?<g aria-label="Lançamentos por município no mês de fechamento">{['Padrão',...FORTALEZA_CITIES,'Total'].map((label,i)=><g key={label}><rect x={50+(i?258+(i-1)*160:0)} y={145} width={i?160:258} height={49} fill="#F1F1F1"/><text x={i?388+(i-1)*160:179} y={176} textAnchor="middle" fontSize={18} fontWeight={700} fill="black">{label}</text></g>)}{table.rows.map((row,index)=><g key={row.label} data-municipal-row={row.label}>{[row.label,...row.values,row.total].map((value,column)=><g key={column}><rect x={column?308+(column-1)*160:50} y={194+index*60} width={column?160:258} height={60} fill={index===2||index===5?'#F1F1F1':column===6?'#D9D9D9':index===3&&column?'#B6EBDF':index===4&&column?'#C3DCEE':'white'} stroke="#DAE4EB"/><text x={column?388+(column-1)*160:179} y={231+index*60} textAnchor="middle" fontSize={column?19:17} fontWeight={index===2||index===5?700:400} fill="black">{typeof value==='number'?value.toLocaleString('pt-BR',{maximumFractionDigits:table.unit==='milhões'?1:0}):value}</text></g>)}</g>)}</g>:<text x={640} y={360} textAnchor="middle" fontSize={24} fill="#1B4059">Aguardando conferência da fonte</text>}
    </>:<>
      <rect x={790} y={116} width={490} height={94} fill="white"/>
      <text x={43} y={218} fill="#1B4059" fontSize={15}>{selection.position}º trimestre de {selection.year}{chart?.baseMonth?` · INCC-DI base ${chart.baseMonth}`:''}</text>
      {chart?.status==='ready'?<><g fill="#1B4059" fontWeight={700} fontSize={23} textAnchor="middle"><text x={860} y={143}>{percentage(chart.changes.total)}</text><text x={1040} y={143}>{percentage(chart.changes.first)}</text><text x={1180} y={143} fill="#42CCA2">{percentage(chart.changes.second)}</text></g><g fill="black" fontSize={12} textAnchor="middle"><text x={860} y={164}>mesmo trimestre</text><text x={860} y={183}>de {selection.year-1}</text><text x={1040} y={166}>{chart.labels[0]}</text><text x={1180} y={166}>{chart.labels[1]}</text><text x={1110} y={188}>acumulado no ano</text></g><Plot bins={chart.history} x={15} width={910} quarterly palette={[14,15].includes(page)?['#3D2055','#42CCA2']:undefined} money={chart.unit==='milhões'}/><Plot bins={chart.accumulated} x={974} width={270} large palette={[14,15].includes(page)?['#3D2055','#42CCA2']:undefined} money={chart.unit==='milhões'}/><g fill="black" fontSize={15} fontWeight={700}><rect x={100} y={596} width={8} height={8} fill="#1B4059"/><text x={116} y={605}>{chart.labels[0]}</text><rect x={470} y={596} width={8} height={8} fill="#42CCA2"/><text x={486} y={605}>{chart.labels[1]}</text><circle cx={850} cy={600} r={4.5} fill="#AA4EBF"/><text x={862} y={605}>Total</text></g></>:<text x={640} y={365} textAnchor="middle" fontSize={24} fill="#1B4059">Aguardando conferência da fonte</text>}
    </>}
    {page!==20&&<text x={555} y={655} fontSize={10} fill="#1B4059">{[13,15].includes(page)?'Classificação por padrão da API; alterações do teto MCMV exigem conferência.':[11,18].includes(page)?'Residencial vertical; classificação por padrão da API.':page===14?'Residencial vertical e casas/sobrados da região metropolitana.':'Vertical, comercial e casas/sobrados; loteamentos possuem bloco próprio.'}</text>}
  </svg>;
}
