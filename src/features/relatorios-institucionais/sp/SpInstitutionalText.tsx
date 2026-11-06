import type { SpPreview } from './model';
import { SP_INSTITUTIONAL_FIGURES,spInstitutionalMonth } from './institutional-content';

/** Preserve the original artwork, replacing its text regions with native SVG labels.
 * The PPTX exporter removes these labels from the art and writes editable text boxes.
 * Logos, the map, QR and interface screenshots remain illustrations.
 */
export function SpInstitutionalText({page,report}:{page:number;report:SpPreview}) {
  // Artwork is 960x540; native coordinates use the exporter's 1280x720 canvas.
  const p=(value:number)=>value*4/3;
  if(page===7)return <svg role="img" aria-label="Perfil da cidade de São Paulo" viewBox="0 0 1280 720" className="absolute inset-0 h-full w-full" style={{fontFamily:'Arial, sans-serif'}}>
    <rect x={p(390)} y={p(85)} width={p(560)} height={p(380)} fill="#f8f8f8"/>
    <text x={p(413)} y={p(140)} fontSize={p(48)} fontWeight="bold" fill="#203211">CIDADE DE</text>
    <text x={p(413)} y={p(197)} fontSize={p(48)} fontWeight="bold" fill="#203211">SÃO PAULO</text>
    <text x={p(415)} y={p(272)} fontSize={p(28)} fontWeight="bold" fill="#262626">{spInstitutionalMonth(report)}</text>
    <rect x={p(394)} y={p(308)} width={p(500)} height={p(126)} rx={p(63)} fill="#5b7638"/>
    <text x={p(434)} y={p(340)} fontSize={p(18)} fill="#ffffff">A cidade analisada nesse estudo representa:</text>
    <text x={p(434)} y={p(384)} fontSize={p(21)} fontWeight="bold" fill="#ffffff">{SP_INSTITUTIONAL_FIGURES.population} da população do estado</text>
    <text x={p(434)} y={p(408)} fontSize={p(21)} fontWeight="bold" fill="#ffffff">{SP_INSTITUTIONAL_FIGURES.consumption} do potencial de consumo do estado</text>
    <text x={p(434)} y={p(456)} fontSize={p(11)} fill="#5b7638">Percentuais: referência de junho/2026.</text>
  </svg>;
  if(page===5)return <svg role="img" aria-label="Indicadores institucionais GeoBrain editáveis" viewBox="0 0 1280 720" className="absolute inset-0 h-full w-full" style={{fontFamily:'Arial, sans-serif'}}>
    {SP_INSTITUTIONAL_FIGURES.geobrain.map(card=><g key={card.value}>
      <rect x={p(card.x+10)} y={p(card.y+22)} width={p(166)} height={p(55)} fill="#f2f2f2"/>
      <text x={p(card.x+93)} y={p(card.y+41)} fontSize={p(21)} fontWeight="bold" textAnchor="middle" fill="#5b7638">{card.value}</text>
      {card.lines.map((line,index)=><text key={line} x={p(card.x+93)} y={p(card.y+59+index*14)} fontSize={p(14.5)} textAnchor="middle" fill="#5b7638">{line}</text>)}
    </g>)}
  </svg>;
  return null;
}
