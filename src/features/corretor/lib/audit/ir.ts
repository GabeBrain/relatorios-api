// Tipos do IR (Representação Intermediária) — espelho do schema gerado por
// docs/features/corretor-vocacionais/ir_extractor.py (ir_version 1).
// Permite carregar o .ir.json de um estudo real e rodar o motor DET no browser.

import type { AuditSection } from '../error-catalog';

export interface IrTable {
  n_linhas: number;
  n_colunas: number;
  /** Linhas cruas (texto por célula), incluindo cabeçalho e possível total. */
  linhas: (string | null)[][];
  /** Mesma forma de `linhas`, com números pt-BR já parseados (ou null). */
  linhas_num: (number | null)[][];
}

export interface IrGraficoSerie {
  nome: string | null;
  categorias: string[];
  valores: (number | null)[];
}
export interface IrGrafico {
  titulo_grafico: string | null;
  series: IrGraficoSerie[];
  arquivo?: string;
}

export interface IrSlide {
  n: number;
  titulo: string | null;
  secao_canonica: string | null;
  textos: string[];
  fontes: string[];
  notas: string[];
  notas_edicao: string[];
  tabelas: IrTable[];
  graficos: IrGrafico[];
  n_imagens: number;
  flags?: Record<string, boolean>;
}

export interface Ir {
  ir_version: number;
  arquivo: string;
  sha1?: string;
  n_slides: number;
  slides: IrSlide[];
}

/** Mapeia a seção canônica do extrator para a seção de auditoria da UI. */
export function toAuditSection(secao: string | null | undefined): AuditSection {
  switch ((secao ?? '').toUpperCase()) {
    case 'SOCIO': return 'SOCIO';
    case 'MERCADO': return 'MERCADO';
    case 'LACUNAS': return 'LACUNAS';
    case 'ABSORCAO': return 'ABSORCAO';
    case 'ENTORNO': return 'ENTORNO';
    case 'IDENTIFICACAO':
    case 'CAPA': return 'ESTRUTURA';
    default: return 'GLOBAL';
  }
}

/** Valida minimamente um objeto carregado como IR. */
export function isIr(x: unknown): x is Ir {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return Array.isArray(o.slides) && typeof o.n_slides === 'number';
}
