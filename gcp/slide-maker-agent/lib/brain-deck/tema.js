// Paleta, fontes e tokens de cor do Manual de Marca Brain (doc 02 §3 e §4).
// Fonte única para a brain-deck; o lint_pptx.py mantém a mesma lista (há teste que compara as duas).

export const FONTE_TITULO = 'Neo Sans Pro';
export const FONTE_CORPO = 'Montserrat';

/** Tema gravado em ppt/theme/theme1.xml pelo apply_theme.js. */
export const TEMA = {
  name: 'Brain',
  headFontFace: FONTE_TITULO,
  bodyFontFace: FONTE_CORPO,
  colors: {
    dk1: '58595B', lt1: 'FFFFFF', dk2: '5B7537', lt2: 'F2F2F2',
    accent1: '5B7537', accent2: 'FFD500', accent3: 'BCBEC0',
    accent4: '2E3525', accent5: '7CA83E', accent6: '1F5F8A',
    hlink: '5B7537', folHlink: '2E3525',
  },
};

/**
 * Tokens de cor aceitos no deck_spec.json. `esquema` é a cor de tema correspondente (mantém o deck
 * editável pelo tema no PowerPoint); sem esquema, a cor sai em HEX.
 * Branco (#FFFFFF) é o fundo e o lt1 do tema da referência aprovada; não consta da tabela do doc 02 §3.
 */
export const CORES = {
  verde: { hex: '5B7537', esquema: 'accent1', familia: 'verde' },
  verde_escuro: { hex: '2E3525', esquema: 'accent4', familia: 'verde' },
  verde_claro: { hex: '7CA83E', esquema: 'accent5', familia: 'verde' },
  verde_mais_claro: { hex: 'B4DB7D', familia: 'verde' },
  amarelo: { hex: 'FFD500', esquema: 'accent2', familia: 'amarelo' },
  amarelo_escuro: { hex: 'B39500', familia: 'amarelo' },
  amarelo_claro: { hex: 'FFE666', familia: 'amarelo' },
  amarelo_mais_claro: { hex: 'FFF7CC', familia: 'amarelo' },
  azul: { hex: '1F5F8A', esquema: 'accent6', familia: 'azul' },
  azul_escuro: { hex: '143C57', familia: 'azul' },
  azul_claro: { hex: '3D8ABD', familia: 'azul' },
  azul_mais_claro: { hex: 'C5DFF0', familia: 'azul' },
  preto: { hex: '000000', familia: 'neutro' },
  texto: { hex: '58595B', esquema: 'tx1', familia: 'neutro' },
  cinza: { hex: 'BCBEC0', esquema: 'accent3', familia: 'neutro' },
  cinza_claro: { hex: 'F2F2F2', esquema: 'bg2', familia: 'neutro' },
  branco: { hex: 'FFFFFF', esquema: 'bg1', familia: 'neutro' },
};

export const TOKENS_COR = Object.keys(CORES);

/** Cor para texto e formas: cor de tema quando existe (editável), senão HEX. */
export function cor(token) {
  const c = CORES[token];
  if (!c) throw new Error(`cor fora da paleta: ${token}`);
  return c.esquema ?? c.hex;
}

/** Cor em HEX (gráficos não aceitam cor de tema no PptxGenJS). */
export function hex(token) {
  const c = CORES[token];
  if (!c) throw new Error(`cor fora da paleta: ${token}`);
  return c.hex;
}

// Geometria do slide 16:9 (LAYOUT_WIDE) e das áreas do layout de conteúdo (referência aprovada).
export const SLIDE = { w: 13.333, h: 7.5 };
export const AREA_CONTEUDO = { x: 0.6, y: 2.3, w: 12.1, h: 4.45 };
