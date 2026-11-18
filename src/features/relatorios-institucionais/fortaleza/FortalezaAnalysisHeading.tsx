/** The reference rule sits at y110; clear it without covering the badge at y0–87. */
export function FortalezaAnalysisHeading({lines,scope}:{lines:string[];scope:string}){
  return <>
    <rect data-fortaleza-header-rule-mask x={0} y={90} width={1280} height={100} fill="white"/>
    <g data-fortaleza-analysis-heading fill="#1B4059">
      <text data-fortaleza-analysis-title x={43} y={26} dominantBaseline="text-before-edge" fontSize={40} fontWeight={700}>{lines.map((line,index)=><tspan key={index} x={43} dy={index?44:0}>{line}</tspan>)}</text>
      <text data-fortaleza-analysis-scope x={43} y={26+lines.length*44+8} dominantBaseline="text-before-edge" fontSize={23}>{scope}</text>
    </g>
  </>;
}
