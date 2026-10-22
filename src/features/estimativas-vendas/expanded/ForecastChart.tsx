import { Area, CartesianGrid, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
export type PlotRow = {
    x: string | number;
    predicted?: number | null;
    history?: number | null;
    actual?: number | null;
    [key: string]: string | number | number[] | null | undefined;
};
export function ForecastChart({ rows, percent = false, series, large = false, cut }: {
    rows: PlotRow[];
    percent?: boolean;
    series?: {
        key: string;
        name: string;
    }[];
    large?: boolean;
    cut?: string | number;
}) {
    const colors = ['hsl(var(--foreground))', 'var(--ev-forecast, var(--gb-oliva-700))', 'var(--gb-verde-500)', 'var(--gb-texto-2)', 'var(--gb-erro)'];
    const definitions = series ?? [{ key: 'history', name: 'Histórico reportado' }, { key: 'predicted', name: 'Previsão' }, { key: 'actual', name: 'Posterior reportado' }].filter(s=>rows.some(r=>typeof r[s.key]==='number'));
    return <div className={large ? 'h-[420px] min-w-0' : 'h-[280px] min-w-0'} role="img" aria-label={`Vendas acumuladas em ${percent ? 'percentual' : 'unidades'}; tabela disponível no detalhe`}><ResponsiveContainer width="100%" height="100%"><ComposedChart data={rows} margin={{ top: 16, right: 12, bottom: 0, left: 0 }}><CartesianGrid strokeDasharray="3 5"/><XAxis dataKey="x" minTickGap={45} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}/><YAxis width={48} domain={percent ? [0, 100] : ['auto', 'auto']} unit={percent ? '%' : undefined} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}/>{cut !== undefined && <ReferenceLine x={cut} stroke="var(--gb-texto-2)" strokeDasharray="3 3" label={{ value: "Corte", position: "insideTopRight", fontSize: 11 }}/>}<Tooltip wrapperStyle={{maxWidth:"min(260px, calc(100vw - 180px))",zIndex:20}} itemStyle={{whiteSpace:"normal",overflowWrap:"anywhere"}} contentStyle={{ fontSize:12, maxWidth:"100%",whiteSpace:"normal", background: 'hsl(var(--popover))', color: 'hsl(var(--popover-foreground))' }} formatter={(v: number | number[]) => Array.isArray(v) ? v.map(n => n.toLocaleString('pt-BR',{maximumFractionDigits:1})).join(' a ') : Number(v).toLocaleString('pt-BR',{maximumFractionDigits:1})}/>{rows.some(r => Array.isArray(r.range80)) && <Area dataKey="range80" name="Faixa 80%" stroke="none" fill="var(--gb-verde-500)" fillOpacity={.12} isAnimationActive={false}/>}{rows.some(r => Array.isArray(r.range50)) && <Area dataKey="range50" name="Faixa 50%" stroke="none" fill="var(--gb-verde-500)" fillOpacity={.24} isAnimationActive={false}/>}{rows.some(r => Array.isArray(r.sourceWide)) && <Area dataKey="sourceWide" name="Faixa ampla da fonte" stroke="none" fill="var(--gb-verde-500)" fillOpacity={.16} isAnimationActive={false}/>}{rows.some(r => Array.isArray(r.sourceCentral)) && <Area dataKey="sourceCentral" name="Faixa central da fonte" stroke="none" fill="var(--gb-verde-500)" fillOpacity={.30} isAnimationActive={false}/>}<Legend wrapperStyle={{ fontSize: 11 }}/>{definitions.map((s, i) => <Line key={s.key} dataKey={s.key} name={s.name} stroke={colors[i % colors.length]} strokeDasharray={i === 2 ? '5 4' : undefined} strokeWidth={s.key === 'predicted' ? 3 : 2} dot={false} connectNulls={false} isAnimationActive={false}/>)}</ComposedChart></ResponsiveContainer></div>;
}
