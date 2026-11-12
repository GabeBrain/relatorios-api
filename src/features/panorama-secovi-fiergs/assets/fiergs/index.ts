import slide01 from './slide-01-institutional.png';
import slide03 from './slide-03-institutional.jpg';
import slide04 from './slide-04-institutional.jpg';
import slide72 from './slide-72-institutional.jpg';
import slide73 from './slide-73-institutional.png';
import slide74 from './slide-74-institutional.jpg';
import slide75 from './slide-75-institutional.png';
import sectionDivider from './section-divider.png';
import regionMap from './region-map.png';

/** Fundos oficiais sem dados variáveis, extraídos do deck FIERGS RM Porto Alegre 4T25. */
export const FIERGS_INSTITUTIONAL_SLIDES: Readonly<Partial<Record<number, string>>> = {
  1: slide01,
  3: slide03,
  4: slide04,
  72: slide72,
  73: slide73,
  74: slide74,
  75: slide75,
};

/** Fundo neutro extraído da abertura oficial; o título permanece uma camada dinâmica. */
export const FIERGS_SECTION_DIVIDER = sectionDivider;
export const FIERGS_REGION_MAP = regionMap;
