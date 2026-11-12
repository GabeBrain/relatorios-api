export type Cohorts = {H: number; K: number; pools: Record<string, (number | number[])[][]>};
export type VerticalOutput = {neighbors: number; central: {t: number; cum: number}[]; conservador: {t: number; cum: number}[]; otimista: {t: number; cum: number}[]; central_esgota: boolean; conservador_esgota: boolean; otimista_esgota: boolean};
export function simulate(data: unknown, pattern: string, units: number, age: number, sold: number): VerticalOutput;
export function poolKey(pattern: string): string;
