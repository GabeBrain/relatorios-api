import type { SpPreview } from './model';
import { useId } from 'react';
import { SP_INSTITUTIONAL_FIGURES,spInstitutionalMonth } from './institutional-content';
import backgrounds from './institutional-text-background.json';

function TextBackground({page}:{page:number}) {
  const id=useId().replace(/:/g,'_');
  return <g aria-hidden="true">{backgrounds.filter(region=>region.page===page).map((region,index)=><g key={index}>{region.bands.map((band,i)=><g key={i}><defs><linearGradient id={`${id}-${index}-${i}`}><stop stopColor={band.left}/><stop offset="1" stopColor={band.right}/></linearGradient></defs><rect x={region.x*4/3} y={(region.y+band.offset)*4/3} width={region.width*4/3} height={band.height*4/3+.2} fill={`url(#${id}-${index}-${i})`}/></g>)}</g>)}</g>;
}

/** Preserve the original artwork, replacing its text regions with native SVG labels.
 * The PPTX exporter removes these labels from the art and writes editable text boxes.
 * Logos, the map, QR and interface screenshots remain illustrations.
 */
export function SpInstitutionalText({page,report}:{page:number;report:SpPreview}) {
  // Artwork is 960x540; native coordinates use the exporter's 1280x720 canvas.
  const p=(value:number)=>value*4/3;
  if(page===84)return <svg role="img" aria-label="Imprensa Brain" viewBox="0 0 1280 720" className="absolute inset-0 h-full w-full">
    <TextBackground page={page}/><rect x={p(99)} y={p(88)} width={p(96)} height={p(20)} fill="#ffcf00"/><text x={p(103)} y={p(104)} fontSize={p(17)} fontWeight="bold" fill="#5b7638">IMPRENSA</text>
    {['Compartilhar conhecimento','faz parte do nosso DNA.'].map((line,i)=><text key={i} x={p(103)} y={p(175+i*21)} fontSize={p(17)} fontWeight="bold" fill="#ffcf00">{line}</text>)}
    {['No último ano, nossos dados e','análises contribuíram com mais','de 3.400 pautas jornalísticas.'].map((line,i)=><text key={i} x={p(103)} y={p(238+i*23)} fontSize={p(17)} fill="#fff">{line}</text>)}
    {['Caso deseje divulgar dados de','nossos estudos e pesquisas,','entre em contato com nossa','assessoria de imprensa.'].map((line,i)=><text key={i} x={p(195)} y={p(390+i*15.5)} fontSize={p(12.5)} fill="#fff">{line}</text>)}
  </svg>;
  if(page===85)return <svg role="img" aria-label="Contato Brain" viewBox="0 0 1280 720" className="absolute inset-0 h-full w-full"><TextBackground page={page}/>{['Rua Coronel Airton Plaisant, 307','Curitiba, PR - 80310-160','(41) 3243-2880'].map((line,i)=><text key={i} x={p(480)} y={p(370+i*21)} textAnchor="middle" fontSize={p(17)} fill="#fff">{line}</text>)}</svg>;
  if(page===3)return <svg role="img" aria-label="Grupo Brain" viewBox="0 0 1280 720" className="absolute inset-0 h-full w-full">
    {[
      {x:98,phoneX:124,lines:['Inteligência','estratégica para','organizações'],phone:'(41) 3243-2880'},
      {x:386,phoneX:411,lines:['Plataforma de','georreferenciamento','imobiliário'],phone:'(41) 3243-2880'},
      {x:670,phoneX:699,lines:['Inteligência financeira','para o mercado','imobiliário'],phone:'(11) 96467-2557'},
    ].map((column,i)=><g key={i}><rect x={p(column.x-5)} y={p(398)} width={p(i===2?265:240)} height={p(70)} fill="#f2f2f2"/><rect x={p(column.phoneX-2)} y={p(474)} width={p(195)} height={p(22)} fill="#f2f2f2"/>{column.lines.map((line,j)=><text key={j} x={p(column.x)} y={p(414+j*21)} fontSize={p(17)} fontWeight="bold" fill="#405528">{line}</text>)}<text x={p(column.phoneX)} y={p(490)} fontSize={p(16)} fill="#405528">{column.phone}</text></g>)}
  </svg>;
  if(page===4)return <svg role="img" aria-label="Sobre a Brain" viewBox="0 0 1280 720" className="absolute inset-0 h-full w-full">
    <TextBackground page={page}/><rect x={p(78)} y={p(101)} width={p(116)} height={p(22)} fill="#ffcf00"/><text x={p(82)} y={p(119)} fontSize={p(16)} fontWeight="bold" fill="#5b7638">SOBRE A BRAIN</text>
    {['Atuamos a nível nacional com a promoção de','inteligência estratégica para organizações, através','de estudos, pesquisas, treinamentos e consultorias','especializadas. Somos amplamente reconhecidos','por nossa expertise no mercado imobiliário e pela','realização de pesquisas mercadológicas e de opinião.'].map((line,i)=><text key={i} x={p(82)} y={p(185+i*21.5)} fontSize={p(17)} fill={i===1?'#ffcf00':'#fff'}>{line}</text>)}
    {[
      {x:128,value:'23',lines:['anos de','empresa']},{x:305,value:'1.000',lines:['cidades','brasileiras']},{x:483,value:'9.200',lines:['estudos de','mercado']},{x:660,value:'50.000',lines:['entrevistas','anualmente']},{x:835,value:'R$ 380bi',lines:['em VGV','pesquisados']},
    ].map((card,i)=><g key={i}><rect x={p(card.x-66)} y={p(395)} width={p(132)} height={p(72)} fill="#f2f2f2"/><text x={p(card.x)} y={p(419)} fontSize={p(i===4?22:24)} fontWeight="bold" textAnchor="middle" fill="#5b7638">{card.value}</text>{card.lines.map((line,j)=><text key={j} x={p(card.x)} y={p(442+j*17)} fontSize={p(17)} textAnchor="middle" fill="#5b7638">{line}</text>)}</g>)}
  </svg>;
  if(page===7)return <svg role="img" aria-label="Perfil da cidade de São Paulo" viewBox="0 0 1280 720" className="absolute inset-0 h-full w-full" style={{fontFamily:'Tahoma, sans-serif'}}>
    <rect x={p(390)} y={p(85)} width={p(560)} height={p(380)} fill="#f8f8f8"/>
    <text x={p(413)} y={p(140)} fontSize={p(48)} fontWeight="bold" fill="#203211">CIDADE DE</text>
    <text x={p(413)} y={p(197)} fontSize={p(48)} fontWeight="bold" fill="#203211">SÃO PAULO</text>
    <text x={p(415)} y={p(272)} fontSize={p(28)} fontWeight="bold" fill="#262626">{spInstitutionalMonth(report)}</text>
    <rect x={p(394)} y={p(308)} width={p(500)} height={p(126)} rx={p(63)} fill="#5b7638"/>
    <text x={p(434)} y={p(340)} fontSize={p(18)} fill="#ffffff">A cidade analisada nesse estudo representa:</text>
    <text x={p(434)} y={p(384)} fontSize={p(21)} fontWeight="bold" fill="#ffffff">{SP_INSTITUTIONAL_FIGURES.population} da população do estado</text>
    <text x={p(434)} y={p(408)} fontSize={p(21)} fontWeight="bold" fill="#ffffff">{SP_INSTITUTIONAL_FIGURES.consumption} do potencial de consumo do estado</text>
  </svg>;
  if(page===5)return <svg role="img" aria-label="Indicadores institucionais Geobrain editáveis" viewBox="0 0 1280 720" className="absolute inset-0 h-full w-full" style={{fontFamily:'Tahoma, sans-serif'}}>
    <TextBackground page={page}/>{['Tenha acesso à base','de dados imobiliários','mais qualificada e','completa do país.'].map((line,i)=><text key={i} x={p(635)} y={p(405+i*22)} fontSize={p(20)} fill="#fff">{line}</text>)}
    {SP_INSTITUTIONAL_FIGURES.geobrain.map(card=><g key={card.value}>
      <rect x={p(card.x+10)} y={p(card.y+22)} width={p(166)} height={p(55)} fill="#f2f2f2"/>
      <text x={p(card.x+93)} y={p(card.y+41)} fontSize={p(21)} fontWeight="bold" textAnchor="middle" fill="#5b7638">{card.value}</text>
      {card.lines.map((line,index)=><text key={line} x={p(card.x+93)} y={p(card.y+59+index*14)} fontSize={p(14.5)} textAnchor="middle" fill="#5b7638">{line}</text>)}
    </g>)}
  </svg>;
  return null;
}
