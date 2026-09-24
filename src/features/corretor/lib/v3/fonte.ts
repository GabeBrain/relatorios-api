export type FonteScalar = string | number | boolean | null;

export interface FonteValues {
  [conceito: string]: number | null;
}

export interface FonteRecortes {
  [recorte: string]: FonteValues;
}

export interface FonteItem {
  rotulo: string | null;
  linha: number;
  valores?: FonteValues;
  recortes?: FonteRecortes;
}

export interface FonteBloco {
  papel: string;
  tabela: string;
  recorte: string | null;
  arquivo: string;
  aba: string;
  cabecalho_linha?: number;
  conceitos?: string[];
  recortes?: string[];
  itens?: FonteItem[];
  valores?: Array<Record<string, unknown>>;
  total?: FonteItem | null;
}

export interface FonteAviso {
  tipo?: string;
  [campo: string]: unknown;
}

export interface Fonte {
  fonte_version: number;
  estudo: string;
  gerado_em?: string;
  pasta?: string;
  inventario: Array<Record<string, FonteScalar>>;
  blocos: FonteBloco[];
  avisos: FonteAviso[];
}

export interface FonteValidation {
  ok: boolean;
  errors: string[];
  fonte?: Fonte;
}

const object = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

/** Validação de fronteira: fonte inválida nunca entra no motor como verdade. */
export function validateFonte(value: unknown): FonteValidation {
  const errors: string[] = [];
  if (!object(value)) return { ok: false, errors: ['A fonte deve ser um objeto JSON.'] };
  if (value.fonte_version !== 1) errors.push('fonte_version deve ser 1.');
  if (typeof value.estudo !== 'string' || !value.estudo.trim()) errors.push('estudo é obrigatório.');
  if (!Array.isArray(value.inventario)) errors.push('inventario deve ser uma lista.');
  if (!Array.isArray(value.avisos)) errors.push('avisos deve ser uma lista.');
  if (!Array.isArray(value.blocos)) {
    errors.push('blocos deve ser uma lista.');
  } else {
    value.blocos.forEach((raw, index) => {
      if (!object(raw)) { errors.push(`blocos[${index}] deve ser um objeto.`); return; }
      for (const field of ['papel', 'tabela', 'arquivo', 'aba']) {
        if (typeof raw[field] !== 'string' || !(raw[field] as string).trim()) {
          errors.push(`blocos[${index}].${field} é obrigatório.`);
        }
      }
      const tabular = raw.papel === 'oferta' || raw.papel === 'socio';
      if (tabular && (!Number.isInteger(raw.cabecalho_linha) || (raw.cabecalho_linha as number) < 1)) {
        errors.push(`blocos[${index}].cabecalho_linha deve ser um inteiro positivo em blocos tabulares.`);
      }
      if (raw.papel !== 'absorcao' && !Array.isArray(raw.itens)) {
        errors.push(`blocos[${index}].itens deve ser uma lista.`);
      }
      if (raw.papel === 'absorcao' && !Array.isArray(raw.valores)) {
        errors.push(`blocos[${index}].valores deve ser uma lista em absorção.`);
      }
    });
  }
  return errors.length ? { ok: false, errors } : { ok: true, errors, fonte: value as unknown as Fonte };
}

export function parseFonteJson(text: string): FonteValidation {
  try { return validateFonte(JSON.parse(text)); }
  catch { return { ok: false, errors: ['O arquivo não contém JSON válido.'] }; }
}
