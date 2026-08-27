import type { Quarter } from '../types';

/** Janela editorial do Panorama: 17 trimestres terminando no fechamento escolhido. */
export const EDITORIAL_WINDOW = 17;

const QUARTER_PATTERN = /^([1-4])T(\d{4})$/;

export function isQuarter(value: unknown): value is Quarter {
  return QUARTER_PATTERN.test(String(value ?? ''));
}

export function parseQuarter(value: unknown): Quarter | null {
  const raw = String(value ?? '').trim().toUpperCase();
  const direct = QUARTER_PATTERN.exec(raw);
  if (direct) return `${Number(direct[1]) as 1 | 2 | 3 | 4}T${Number(direct[2])}` as Quarter;
  const iso = /^(\d{4})-(\d{1,2})/.exec(raw);
  const brazil = /^(\d{1,2})\/(\d{4})$/.exec(raw);
  const year = Number(iso?.[1] ?? brazil?.[2]);
  const month = Number(iso?.[2] ?? brazil?.[1]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return null;
  return `${Math.ceil(month / 3) as 1 | 2 | 3 | 4}T${year}` as Quarter;
}

/** Índice absoluto e monotônico; permite comparar e deslocar trimestres sem tabelas fixas. */
export function quarterIndex(quarter: Quarter): number {
  const match = QUARTER_PATTERN.exec(quarter);
  if (!match) throw new Error(`Trimestre inválido: ${quarter}`);
  return Number(match[2]) * 4 + Number(match[1]) - 1;
}

export function quarterFromIndex(index: number): Quarter {
  return `${(index % 4) + 1}T${Math.floor(index / 4)}` as Quarter;
}

export function compareQuarters(a: Quarter, b: Quarter): number {
  return quarterIndex(a) - quarterIndex(b);
}

export function shiftQuarter(quarter: Quarter, offset: number): Quarter {
  return quarterFromIndex(quarterIndex(quarter) + offset);
}

export function quarterYear(quarter: Quarter): number {
  return Number(QUARTER_PATTERN.exec(quarter)![2]);
}

/** Último dia do trimestre, no formato aceito por `end_period` da API temporal. */
export function quarterEndDate(quarter: Quarter): string {
  const match = QUARTER_PATTERN.exec(quarter);
  if (!match) throw new Error(`Trimestre inválido: ${quarter}`);
  const month = Number(match[1]) * 3;
  const lastDay = new Date(Date.UTC(Number(match[2]), month, 0)).getUTCDate();
  return `${match[2]}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
}

/** Primeiro dia do trimestre; usado para `start_period` derivado da janela, não de um ano fixo. */
export function quarterStartDate(quarter: Quarter): string {
  const match = QUARTER_PATTERN.exec(quarter);
  if (!match) throw new Error(`Trimestre inválido: ${quarter}`);
  return `${match[2]}-${String(Number(match[1]) * 3 - 2).padStart(2, '0')}-01`;
}

/** Mês de fechamento (`YYYY-MM`) usado para escolher o último snapshot do histórico. */
export function quarterEndMonth(quarter: Quarter): string {
  const match = QUARTER_PATTERN.exec(quarter);
  if (!match) throw new Error(`Trimestre inválido: ${quarter}`);
  return `${match[2]}-${String(Number(match[1]) * 3).padStart(2, '0')}`;
}

/** Gera a janela editorial terminando em `endQuarter`, sem limite superior fixo em 1T2026. */
export function editorialWindow(endQuarter: Quarter, length: number = EDITORIAL_WINDOW): Quarter[] {
  const end = quarterIndex(endQuarter);
  return Array.from({ length }, (_, index) => quarterFromIndex(end - (length - 1) + index));
}

export function quarterOfDate(date: Date): Quarter {
  return `${(Math.floor(date.getUTCMonth() / 3) + 1) as 1 | 2 | 3 | 4}T${date.getUTCFullYear()}` as Quarter;
}

/**
 * Opções de fechamento oferecidas ao usuário: do início histórico do produto até o trimestre
 * corrente, sem travar em 1T2026. `reference` permite testes determinísticos.
 */
export function availableEndQuarters(firstQuarter: Quarter = '1T2019', reference: Date = new Date()): Quarter[] {
  const first = quarterIndex(firstQuarter);
  const last = quarterIndex(quarterOfDate(reference));
  if (last < first) return [quarterFromIndex(first)];
  return Array.from({ length: last - first + 1 }, (_, index) => quarterFromIndex(first + index));
}
