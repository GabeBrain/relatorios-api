/**
 * Identificação e "Meus trabalhos" no navegador (INSTRUCOES §8 e §9). O e-mail só identifica o autor;
 * quem dá acesso a um trabalho é o token dele, guardado aqui. Um navegador novo não vê os trabalhos
 * antigos (limitação aceita na v1). Toda leitura e escrita tolera localStorage indisponível.
 */
import { DOMINIO_EMAIL } from '../types';

const CHAVE_EMAIL = 'slide-maker:email';
const CHAVE_TRABALHOS = 'slide-maker:trabalhos';

export interface TrabalhoLocal {
  jobId: string;
  token: string;
  titulo: string;
  criadoEm: string;
}

function ler(chave: string): string | null {
  try {
    return window.localStorage.getItem(chave);
  } catch {
    return null;
  }
}

function gravar(chave: string, valor: string | null): void {
  try {
    if (valor === null) window.localStorage.removeItem(chave);
    else window.localStorage.setItem(chave, valor);
  } catch {
    /* sem armazenamento: a sessão segue, só não lembra no próximo acesso */
  }
}

export function emailValido(email: string): boolean {
  const e = email.trim().toLowerCase();
  return e.endsWith(DOMINIO_EMAIL) && /^[^@\s]+@brain\.srv\.br$/.test(e);
}

export const identidade = {
  ler: (): string | null => {
    const e = ler(CHAVE_EMAIL);
    return e && emailValido(e) ? e : null;
  },
  salvar: (email: string) => gravar(CHAVE_EMAIL, email.trim().toLowerCase()),
  limpar: () => gravar(CHAVE_EMAIL, null),
};

export const trabalhosLocais = {
  listar(): TrabalhoLocal[] {
    try {
      const v = JSON.parse(ler(CHAVE_TRABALHOS) ?? '[]');
      return Array.isArray(v) ? v.filter((t) => t && typeof t.jobId === 'string' && typeof t.token === 'string') : [];
    } catch {
      return [];
    }
  },
  adicionar(t: TrabalhoLocal): void {
    const outros = trabalhosLocais.listar().filter((x) => x.jobId !== t.jobId);
    gravar(CHAVE_TRABALHOS, JSON.stringify([t, ...outros]));
  },
  token(jobId: string): string | null {
    return trabalhosLocais.listar().find((t) => t.jobId === jobId)?.token ?? null;
  },
};
