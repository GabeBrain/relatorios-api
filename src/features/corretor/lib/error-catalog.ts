// Catálogo central dos tipos de erro do Corretor (fonte única de verdade).
// Base: docs/features/corretor-vocacionais/regras_em_linguagem_natural.md
//       e HANDOFF_fase_e_interface.md (§3 modos, §4 padrões de visualização).

export type ErrorType =
  // Numéricas / consistência
  | 'PERCENTAGE_SUM'
  | 'ABSOLUTE_SUM'
  | 'TOTALS_EQUALITY'
  | 'CROSS_TABLE_MISMATCH'
  | 'BINNING_RULE'
  | 'TEMPORAL_WINDOW'
  | 'PROJECTION_FORMULA'
  | 'IBGE_MISMATCH'
  | 'VALUE_PLAUSIBILITY'
  // Contexto / texto
  | 'CITY_NAME'
  | 'WRONG_CONTEXT'
  | 'RADII'
  | 'SPELLING'
  | 'COHERENCE'
  // Estrutura / presença
  | 'STRUCTURE_MISSING'
  | 'SOURCE_MISSING'
  | 'REQUIRED_NOTE'
  | 'EXCLUSION_RULE'
  | 'LEFTOVER_NOTE'
  | 'ATA_COVERAGE'
  // Visual
  | 'MAP_CHART_MISMATCH';

/** PLENO = regra completa · BETA = roda com aproximação · MOCK = UI com fixture, motor pendente. */
export type ErrorMode = 'PLENO' | 'BETA' | 'MOCK';

/** Padrão de visualização (HANDOFF §4). */
export type VizPattern =
  | 'overlay'      // apontar ONDE na thumbnail
  | 'table'        // tabela com células marcadas
  | 'sidebyside'   // comparar A × B
  | 'binrange'     // régua de faixas
  | 'map'          // mapa + métricas
  | 'checklist';   // presença de seções/itens

export type Motor = 'DET' | 'IA' | 'DET+IA';

export type AuditSection =
  | 'ESTRUTURA' | 'SOCIO' | 'MERCADO' | 'LACUNAS'
  | 'ABSORCAO' | 'ENTORNO' | 'ATA' | 'GLOBAL';

export interface ErrorMeta {
  label: string;        // rótulo curto pt-BR
  description: string;  // o que a regra verifica, em linguagem natural
  mode: ErrorMode;
  viz: VizPattern;
  motor: Motor;
}

export const ERROR_CATALOG: Record<ErrorType, ErrorMeta> = {
  PERCENTAGE_SUM: { label: 'Soma %', description: 'Colunas de percentual devem somar 100% no total.', mode: 'PLENO', viz: 'table', motor: 'DET' },
  ABSOLUTE_SUM: { label: 'Soma absoluta', description: 'Linhas e colunas de valores absolutos devem fechar no total declarado.', mode: 'PLENO', viz: 'table', motor: 'DET' },
  TOTALS_EQUALITY: { label: 'Igualdade de totais', description: 'Total de oferta = total por tipologia; consolidada bate com as análises.', mode: 'BETA', viz: 'table', motor: 'DET' },
  CROSS_TABLE_MISMATCH: { label: 'Inconsistência entre tabelas', description: 'Faixas e valores repetidos em slides diferentes devem ser idênticos.', mode: 'BETA', viz: 'sidebyside', motor: 'DET' },
  BINNING_RULE: { label: 'Faixas', description: 'Faixas de valores não podem ter furo nem sobreposição; agrupamentos seguem a regra.', mode: 'PLENO', viz: 'binrange', motor: 'DET' },
  TEMPORAL_WINDOW: { label: 'Janela temporal', description: 'Projeções cobrem a janela canônica de 6 anos; slides irmãos usam a mesma base.', mode: 'BETA', viz: 'sidebyside', motor: 'DET' },
  PROJECTION_FORMULA: { label: 'Fórmula de projeção', description: 'A projeção deve seguir a taxa/ritmo informado; fórmula oficial ainda pendente.', mode: 'BETA', viz: 'table', motor: 'DET' },
  IBGE_MISMATCH: { label: 'Batimento IBGE', description: '% de domicílios por tipo/ocupação batem com o Censo 2022 do município.', mode: 'MOCK', viz: 'table', motor: 'DET' },
  VALUE_PLAUSIBILITY: { label: 'Plausibilidade', description: 'Valores fora do padrão: taxa alta demais, m² fora da faixa, monotonicidade quebrada.', mode: 'BETA', viz: 'table', motor: 'DET+IA' },
  CITY_NAME: { label: 'Nome da cidade', description: 'Nome de cidade no slide deve ser o da cidade do estudo.', mode: 'PLENO', viz: 'overlay', motor: 'IA' },
  WRONG_CONTEXT: { label: 'Contexto errado', description: 'Dados de outro estudo/cidade vazados por copy-paste.', mode: 'BETA', viz: 'overlay', motor: 'DET+IA' },
  RADII: { label: 'Raios', description: 'Referências a raios/zonas de tempo devem ser os raios contratados.', mode: 'PLENO', viz: 'map', motor: 'DET' },
  SPELLING: { label: 'Ortografia', description: 'Texto legível verificado contra erros de português.', mode: 'PLENO', viz: 'overlay', motor: 'IA' },
  COHERENCE: { label: 'Coerência texto×tabela', description: 'Números citados no texto batem com os valores da tabela do slide.', mode: 'PLENO', viz: 'overlay', motor: 'IA' },
  STRUCTURE_MISSING: { label: 'Estrutura', description: 'Todas as seções obrigatórias presentes, na ordem.', mode: 'BETA', viz: 'checklist', motor: 'DET' },
  SOURCE_MISSING: { label: 'Fonte ausente', description: 'Slide com dado deve indicar fonte no texto ou imagem; validar o beta contra estudos reais.', mode: 'BETA', viz: 'overlay', motor: 'DET+IA' },
  REQUIRED_NOTE: { label: 'Nota obrigatória', description: 'Slides específicos exigem notas padrão (ex.: absorção desconsidera 2ª moradia).', mode: 'BETA', viz: 'overlay', motor: 'DET' },
  EXCLUSION_RULE: { label: 'Exclusões', description: 'Lacunas excluem Gardens, Duplex e Coberturas; esgotados variam por análise.', mode: 'BETA', viz: 'table', motor: 'DET' },
  LEFTOVER_NOTE: { label: 'Nota de edição vazada', description: 'Comentário interno do revisor esquecido no deck (rede de segurança).', mode: 'PLENO', viz: 'overlay', motor: 'DET' },
  ATA_COVERAGE: { label: 'Cobertura da ata', description: 'Pedidos da ata são buscados no estudo por evidência textual; itens sem evidência pedem revisão.', mode: 'BETA', viz: 'checklist', motor: 'DET' },
  MAP_CHART_MISMATCH: { label: 'Mapa × gráfico', description: 'Dados exibidos no mapa correspondem ao gráfico/tabela do slide.', mode: 'MOCK', viz: 'map', motor: 'IA' },
};

export const ERROR_LABELS: Record<ErrorType, string> = Object.fromEntries(
  Object.entries(ERROR_CATALOG).map(([k, v]) => [k, v.label])
) as Record<ErrorType, string>;

export function errorLabel(type: ErrorType): string {
  return ERROR_CATALOG[type]?.label ?? type;
}

export const MODE_META: Record<ErrorMode, { label: string; hint: string; className: string }> = {
  PLENO: { label: 'Pleno', hint: 'Regra completa rodando', className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
  BETA: { label: 'β', hint: 'Roda com aproximação — validar', className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' },
  MOCK: { label: 'demo', hint: 'Visualização com dados do piloto; motor pendente', className: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30' },
};

export const SECTION_LABELS: Record<AuditSection, string> = {
  ESTRUTURA: 'Estrutura', SOCIO: 'Socioeconômico', MERCADO: 'Mercado', LACUNAS: 'Lacunas',
  ABSORCAO: 'Absorção', ENTORNO: 'Entorno', ATA: 'Ata', GLOBAL: 'Global',
};
