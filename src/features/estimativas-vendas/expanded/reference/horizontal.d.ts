export interface HorizontalOutput {
  esgotado: boolean;
  tabela: {t: number; vendas: number; acumulado: number; estoque: number; central_min: number; central_max: number; ampla_min: number; ampla_max: number}[];
  resumo?: {grupo: string; k: number; mes_esgotamento: number | null; vendas_12m: number; esgotamento_central: (number | null)[]; esgotamento_amplo: (number | null)[]};
}
export function projetar(parameters: unknown, pattern: string, units: number, age: number, sold: number): HorizontalOutput;
