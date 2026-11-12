import { LIMITES } from './config.js';

const ZIP = [0x50, 0x4b, 0x03, 0x04];

/** Extensões aceitas (§1, §8), com a assinatura binária esperada e o MIME gravado. */
const TIPOS: Record<string, { assinatura: number[]; mime: string }> = {
  '.pptx': { assinatura: ZIP, mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' },
  '.xlsx': { assinatura: ZIP, mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  '.docx': { assinatura: ZIP, mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  '.pdf': { assinatura: [0x25, 0x50, 0x44, 0x46, 0x2d], mime: 'application/pdf' },
  '.png': { assinatura: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], mime: 'image/png' },
  '.jpg': { assinatura: [0xff, 0xd8, 0xff], mime: 'image/jpeg' },
  '.jpeg': { assinatura: [0xff, 0xd8, 0xff], mime: 'image/jpeg' },
};

export const EXTENSOES_ACEITAS = Object.keys(TIPOS);

export class UploadInvalido extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'UploadInvalido';
  }
}

/**
 * Nome seguro para o Storage e para o disco: sem caminho, sem caracteres de controle, sem
 * acentos problemáticos para chaves de objeto, com a extensão preservada.
 */
export function nomeSeguro(original: string): string {
  const base = original.split(/[\\/]/).pop() ?? '';
  const limpo = base
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9._ -]/g, '_')
    .replace(/\s+/g, ' ')
    .replace(/^[.\s]+/, '')
    .trim()
    .slice(-120);
  return limpo || 'arquivo';
}

export function extensao(nome: string): string {
  const m = nome.toLowerCase().match(/\.[a-z0-9]+$/);
  return m ? m[0] : '';
}

/** Valida um arquivo enviado. Lança `UploadInvalido` com mensagem para o usuário. */
export function validarArquivo(nomeOriginal: string, dados: Uint8Array): { nome: string; mime: string } {
  const ext = extensao(nomeOriginal);
  const tipo = TIPOS[ext];
  if (!tipo) throw new UploadInvalido(`"${nomeSeguro(nomeOriginal)}": formato não aceito. Envie ${EXTENSOES_ACEITAS.join(', ')}.`);
  if (dados.length === 0) throw new UploadInvalido(`"${nomeSeguro(nomeOriginal)}" está vazio.`);
  if (dados.length > LIMITES.maxBytesArquivo) throw new UploadInvalido(`"${nomeSeguro(nomeOriginal)}" passa de 50 MB.`);
  if (!tipo.assinatura.every((b, i) => dados[i] === b)) {
    throw new UploadInvalido(`"${nomeSeguro(nomeOriginal)}" não parece ser um arquivo ${ext} válido.`);
  }
  return { nome: nomeSeguro(nomeOriginal), mime: tipo.mime };
}

/** Garante nomes únicos dentro de um envio ("a.pdf", "a (2).pdf"). */
export function desduplicar(nomes: string[]): string[] {
  const vistos = new Set<string>();
  return nomes.map((n) => {
    let candidato = n;
    const ext = extensao(n);
    const raiz = ext ? n.slice(0, -ext.length) : n;
    for (let i = 2; vistos.has(candidato.toLowerCase()); i++) candidato = `${raiz} (${i})${ext}`;
    vistos.add(candidato.toLowerCase());
    return candidato;
  });
}
