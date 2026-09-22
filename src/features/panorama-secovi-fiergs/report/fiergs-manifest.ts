export type FiergsSlideAutomation = 'static' | 'hybrid' | 'dynamic';

export interface FiergsSlideDefinition {
  slide: number;
  title: string;
  automation: FiergsSlideAutomation;
  dataFamily: 'institutional' | 'launches' | 'sales' | 'offer' | 'ivv' | 'prices' | 'vertical' | 'horizontal' | 'maps' | 'credits';
}

const titles = [
  'Capa institucional', 'RM de Porto Alegre · Mercado Imobiliário · 4T25', 'Institucional', 'Institucional', 'Abertura do estudo', 'Sumário', 'Região Metropolitana de Porto Alegre',
  'Lançamentos verticais', 'Empreendimentos verticais lançados por trimestre', 'Empreendimentos verticais lançados por padrão', 'Empreendimentos verticais lançados · acumulado 12 meses', 'Unidades verticais lançadas por trimestre', 'Unidades verticais lançadas por padrão', 'Unidades verticais lançadas · acumulado 12 meses', 'Unidades verticais lançadas por trimestre', 'Unidades verticais lançadas · acumulado 12 meses', 'Unidades verticais lançadas por tipologia', 'Unidades verticais lançadas por padrão', 'Unidades verticais lançadas por bairro e cidade', 'VGV lançado vertical', 'VGV lançado vertical por padrão', 'VGV lançado vertical · acumulado 12 meses',
  'Vendas verticais', 'Unidades verticais vendidas por trimestre', 'Unidades verticais vendidas por padrão', 'Unidades verticais vendidas · acumulado 12 meses', 'Unidades verticais vendidas por trimestre', 'Unidades verticais vendidas · acumulado 12 meses', 'Unidades verticais vendidas por tipologia', 'Unidades verticais vendidas por padrão', 'Unidades verticais vendidas por bairro e cidade', 'VGV vendido vertical', 'VGV vendido vertical · acumulado 12 meses',
  'Oferta', 'Oferta final vertical por trimestre', 'Oferta final por tipologia', 'Oferta final por padrão',
  'VSO / IVV', 'IVV por trimestre', 'IVV por área útil · último trimestre', 'IVV por área útil · último ano',
  'Evolução dos preços', 'Evolução do R$/m² vertical · média', 'Evolução do R$/m² · 1 dormitório', 'Evolução do R$/m² · 2 dormitórios', 'Evolução do R$/m² · 3 dormitórios', 'Evolução do R$/m² · 4 dormitórios',
  'Preços por tipologia e padrão', 'Ticket médio por padrão residencial', 'Preço médio m²/privativo por padrão', 'Ticket médio por tipologia residencial', 'Preço médio m²/privativo por tipologia',
  'Estado atual do mercado residencial vertical', 'Oferta final por ano de lançamento', 'Oferta final por padrão', 'Oferta final por tipologia', 'Oferta final por tipologia e metragem', 'Mínimo, média e máximo do preço por tipologia', 'Tempo médio da oferta lançada e final por tipologia', 'Tempo médio da oferta lançada e final por padrão', 'VGV ofertado e disponível por padrão',
  'Estado atual do mercado residencial horizontal', 'Oferta lançada e final por tipo', 'Oferta final por ano de lançamento', 'Preço médio por tipo', 'Mínimo, média e máxima por tipo',
  'Mapa de localização por padrão', 'Mapa de localização por estoque', 'Mapa de localização por R$/m²',
  'Consultores do estudo', 'Equipe técnica', 'Encerramento institucional', 'Encerramento institucional', 'Encerramento institucional', 'Encerramento institucional',
] as const;

const dividers = new Set([8, 23, 34, 38, 42, 48, 53, 62, 70]);
const staticSlides = new Set([1, 3, 4, 72, 73, 74, 75]);

function family(slide: number): FiergsSlideDefinition['dataFamily'] {
  if (slide <= 7) return 'institutional';
  if (slide <= 22) return 'launches';
  if (slide <= 33) return 'sales';
  if (slide <= 37) return 'offer';
  if (slide <= 41) return 'ivv';
  if (slide <= 52) return 'prices';
  if (slide <= 61) return 'vertical';
  if (slide <= 66) return 'horizontal';
  if (slide <= 69) return 'maps';
  return 'credits';
}

/** Registro canônico dos 75 slides do estudo oficial FIERGS RM Porto Alegre 4T25. */
export const FIERGS_4T25_SLIDE_MANIFEST: FiergsSlideDefinition[] = titles.map((title, index) => {
  const slide = index + 1;
  const automation: FiergsSlideAutomation = staticSlides.has(slide) ? 'static' : dividers.has(slide) || slide <= 7 || slide >= 70 ? 'hybrid' : 'dynamic';
  return { slide, title, automation, dataFamily: family(slide) };
});

