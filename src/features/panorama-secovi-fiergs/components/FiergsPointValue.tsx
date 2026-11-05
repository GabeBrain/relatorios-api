export function FiergsPointValue({ x, y, value, index, data, format, referenceQuarter, color = "#5d7737", offset = 0 }: { x?: number; y?: number; value?: number; index?: number; data: { quarter: string }[]; format: (value: number) => string; referenceQuarter: string; color?: string; offset?: number }) {
  if (x === undefined || y === undefined || value === undefined || index === undefined) return null;
  y += offset;
  const label = format(Number(value)); const equivalent = data[index]?.quarter[0] === referenceQuarter;
  // Os atributos visuais essenciais ficam inline de propósito. O preview aplica normalmente as
  // classes CSS ao SVG do Recharts, mas o `html-to-image` serializa os nós customizados em outro
  // SVG: nesse caminho o `<rect>` voltava ao fill preto padrão e o texto branco também perdia o
  // fill, ficando invisível no PDF/PPT. Inline mantém preview e arquivos espelho idênticos.
  const textStyle = { fontFamily: 'Montserrat, Arial, sans-serif', fontSize: '1.12cqw', fontWeight: 700 } as const;
  if (!equivalent) return <text x={x} y={y - 12} textAnchor="middle" className="panorama-fiergs-point" fill="#20231d" stroke="#ffffff" strokeWidth={4} paintOrder="stroke" strokeLinejoin="round" style={textStyle}>{label}</text>;
  const width = Math.max(36, label.length * 8 + 14);
  return <g className="panorama-fiergs-point-highlight"><rect x={x - width / 2} y={y - 29} width={width} height={22} rx={2} fill={color} style={{fill:color}}/><text x={x} y={y - 18} textAnchor="middle" fill={color === "#ffc000" ? "#20231d" : "#ffffff"} dominantBaseline="middle" style={{...textStyle,fill:color === "#ffc000" ? "#20231d" : "#ffffff"}}>{label}</text></g>;
}
