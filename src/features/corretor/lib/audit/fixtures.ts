// Fixtures reais do piloto (Fase C) como dados TS — permitem desenvolver e
// demonstrar toda a UI da Auditoria v2 SEM custo de IA.
// Origem: docs/features/corretor-vocacionais/visao/piloto/*.complemento.json
// e taxonomia_notas.md (notas-gabarito reais do analista).

import type { ExtractedTable, Finding, StudyFixture } from './model';
import { checkTableSums, crossBands, rowLabels, detectBinGap } from './engine';

// ── Tabelas reais extraídas (subconjuntos representativos) ──────────────────

// Itajaí s41 — Domicílios por faixa de renda (colunas SC absoluto + %)
const itaS41: ExtractedTable = {
  title: 'Domicílios por faixa de renda — Santa Catarina',
  columns: ['Faixa de Renda', 'Nº Dom. (SC)', '% (SC)'],
  rows: [
    ['Acima de R$ 40.000,01', 26441, 0.9],
    ['R$ 37.258,01 a R$ 40.000,00', 7851, 0.3],
    ['R$ 34.360,01 a R$ 37.258,00', 12894, 0.4],
    ['R$ 25.710,01 a R$ 34.360,00', 28395, 1.0],
    ['R$ 19.747,01 a R$ 25.710,00', 60700, 2.0],
    ['R$ 16.035,01 a R$ 19.747,00', 67079, 2.3],
    ['R$ 13.561,01 a R$ 16.035,00', 88535, 3.0],
    ['R$ 9.850,01 a R$ 13.561,00', 190977, 6.4],
    ['R$ 6.947,01 a R$ 9.850,00', 409776, 13.8],
    ['R$ 5.499,01 a R$ 6.947,00', 295579, 10.0],
    ['R$ 3.191,01 a R$ 5.499,00', 814398, 27.4],
    ['Abaixo de R$ 3.191,01', 964791, 32.5],
  ],
  totals: ['Total', 2967416, 100],
};

// Faixas de renda usadas no slide de projeção s59 (a faixa 4 diverge do s41)
const itaS59Bands = [
  'Acima de R$ 40.000,01',
  'R$ 37.258,01 a R$ 40.000,00',
  'R$ 34.360,01 a R$ 37.258,00',
  'R$ 21.831,01 a R$ 30.572,00', // ← divergente
  'R$ 19.747,01 a R$ 25.710,00',
  'R$ 16.035,01 a R$ 19.747,00',
  'R$ 13.561,01 a R$ 16.035,00',
  'R$ 9.850,01 a R$ 13.561,00',
  'R$ 6.947,01 a R$ 9.850,00',
  'R$ 5.499,01 a R$ 6.947,00',
  'R$ 3.191,01 a R$ 5.499,00',
  'Abaixo de R$ 3.191,01',
];

// Marka s121 — Tabela de lacunas (tipologia × faixa de m²), Oferta Lançada
const mrkS121: ExtractedTable = {
  title: 'Lacunas — Oferta Lançada (tipologia × m²)',
  columns: ['Tipologia', 'Até 25', '28', '30', '32', '33', '34', '35', '36–40', 'Acima 40', 'Total'],
  rows: [
    ['1 Dormitório', 834, 190, 28, 46, 0, 0, 18, 390, 0, 1506],
    ['2 Dormitórios', 0, 0, 0, 1705, 1223, 924, 0, 1821, 4837, 10510],
    ['3 Dormitórios', 0, 0, 0, 0, 0, 0, 0, 0, 127, 127],
    ['4 Dormitórios', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  ],
  totals: ['Total', 834, 190, 28, 1751, 1223, 924, 18, 2211, 4964, 12143],
};

// ── Construção dos findings via engine ──────────────────────────────────────

const itaFindings: Finding[] = [];

// PERCENTAGE_SUM + ABSOLUTE_SUM — s41 (consistente)
{
  const viz = checkTableSums(itaS41);
  const ok = viz.badColumns!.length === 0 && viz.badRows!.length === 0;
  itaFindings.push({
    id: 'ita-s41-sum',
    type: 'PERCENTAGE_SUM',
    section: 'SOCIO',
    slideRef: 's41',
    title: 'Colunas de % e absolutos fecham no total',
    detail: 'A coluna de % soma 100% e a coluna de domicílios fecha em 2.967.416 — checagem determinística sobre os números extraídos da imagem.',
    ok,
    viz,
  });
}

// CROSS_TABLE_MISMATCH — faixas de renda s41 × s59
{
  const rows = crossBands(rowLabels(itaS41), itaS59Bands, 's41', 's59');
  itaFindings.push({
    id: 'ita-bands-41-59',
    type: 'CROSS_TABLE_MISMATCH',
    section: 'SOCIO',
    slideRef: 's41 × s59',
    title: 'Faixa de renda divergente entre slides',
    detail: 'A 4ª faixa de renda difere entre a tabela de domicílios (s41) e a projeção (s59). As faixas deveriam ser idênticas em toda a seção.',
    gabarito: 'Ajustar com as mesmas rendas do slide',
    ok: false,
    viz: { kind: 'sidebyside', leftLabel: 'Slide 41 (domicílios)', rightLabel: 'Slide 59 (projeção)', rows },
  });
}

// TEMPORAL_WINDOW — janelas s59 × s60
itaFindings.push({
  id: 'ita-temporal-59-60',
  type: 'TEMPORAL_WINDOW',
  section: 'SOCIO',
  slideRef: 's59 × s60',
  title: 'Slides irmãos projetam janelas diferentes',
  detail: 'A projeção do s59 cobre 2026–2031 (base 2025) e a do s60 cobre 2025–2030 (base 2024). Slides irmãos deveriam usar a mesma base e janela (rubrica: 6 anos).',
  gabarito: 'Por favor, verificar essa taxa, me parece que está errada',
  ok: false,
  viz: {
    kind: 'sidebyside', leftLabel: 'Slide 59', rightLabel: 'Slide 60',
    rows: [
      { label: 'Ano base', left: 2025, right: 2024, mismatch: true },
      { label: 'Primeiro ano', left: 2026, right: 2025, mismatch: true },
      { label: 'Último ano', left: 2031, right: 2030, mismatch: true },
      { label: 'Amplitude (anos)', left: 6, right: 6, mismatch: false },
    ],
  },
});

// LEFTOVER_NOTE (PLENO), SOURCE_MISSING (PLENO), SPELLING/CITY_NAME/COHERENCE (PLENO overlay)
itaFindings.push(
  {
    id: 'ita-leftover-s41', type: 'LEFTOVER_NOTE', section: 'SOCIO', slideRef: 's41',
    title: 'Nota interna esquecida no slide', ok: false,
    detail: 'Comentário do revisor deixado no deck. Rede de segurança: estudos entregues não devem conter notas de edição.',
    gabarito: 'Ajustar o erro da fórmula',
    viz: { kind: 'text', location: 'Balão de comentário sobre a tabela', evidence: '“Ajustar o erro da fórmula”' },
  },
  {
    id: 'ita-source-s13', type: 'SOURCE_MISSING', section: 'MERCADO', slideRef: 's13',
    title: 'Tabela sem fonte/elaboração em texto', ok: false,
    detail: 'Slide com tabela mas sem “FONTE: … / ELABORAÇÃO: …” em texto. (Pode ser falso positivo se a fonte estiver dentro da imagem.)',
    viz: { kind: 'text', location: 'Rodapé da tabela' },
  },
  {
    id: 'ita-radii', type: 'RADII', section: 'SOCIO', slideRef: 's30',
    title: 'Raios do mapa conferem com o contratado', ok: true,
    detail: 'Os rótulos de raio detectados batem com os raios contratados do projeto.',
    viz: { kind: 'map', expected: ['10 min', '20 min', '30 min'], detected: ['10 min', '20 min', '30 min'] },
  },
  {
    id: 'ita-structure', type: 'STRUCTURE_MISSING', section: 'ESTRUTURA', slideRef: '—',
    title: 'Seções obrigatórias (β — pré-calibração)', ok: false,
    detail: 'Verificação de completude com o dicionário de seções v0 (a calibrar com a analista).',
    viz: { kind: 'text', checklist: [
      { label: 'Identificação', status: 'ok' },
      { label: 'Socioeconômico', status: 'ok' },
      { label: 'Mercado', status: 'ok' },
      { label: 'Absorção', status: 'na' },
      { label: 'Lacunas', status: 'ok' },
      { label: 'Entorno revendas', status: 'missing' },
      { label: 'Conclusão', status: 'ok' },
    ] },
  },
  {
    id: 'ita-projformula', type: 'PROJECTION_FORMULA', section: 'SOCIO', slideRef: 's59',
    title: 'Fórmula de projeção (demo — motor pendente)', ok: false,
    detail: 'Aguarda a fórmula oficial de projeção de 6 anos com a analista para virar checagem determinística.',
    viz: { kind: 'text', evidence: 'pendente: fórmula + taxa do Brasil' },
  },
  {
    id: 'ita-ibge', type: 'IBGE_MISMATCH', section: 'SOCIO', slideRef: 's39',
    title: 'Batimento IBGE (demo — fonte pendente)', ok: false,
    detail: 'Aguarda definição da fonte do Censo 2022 por município para comparar % de domicílios.',
    viz: { kind: 'text', evidence: 'pendente: fonte IBGE (API/CSV)' },
  },
  {
    id: 'ita-ata', type: 'ATA_COVERAGE', section: 'ATA', slideRef: 'ata',
    title: 'Cobertura da ata (demo — extração pendente)', ok: false,
    detail: 'A ata pediu itens que o corretor deve confirmar no estudo. Extração da ata (imagem→texto) pendente.',
    viz: { kind: 'text', checklist: [
      { label: 'Slide de previsão de entrega checada na base', status: 'missing' },
      { label: 'Concorrentes do “Rio do Meio”', status: 'ok' },
      { label: 'Áreas de lazer dos concorrentes', status: 'na' },
    ] },
  },
);

// Marka —
const mrkFindings: Finding[] = [];

// ABSOLUTE_SUM — s121 (consistente)
{
  const viz = checkTableSums(mrkS121);
  const ok = viz.badColumns!.length === 0 && viz.badRows!.length === 0;
  mrkFindings.push({
    id: 'mrk-s121-sum', type: 'ABSOLUTE_SUM', section: 'LACUNAS', slideRef: 's121',
    title: 'Lacunas — linhas e colunas fecham nos totais',
    detail: '19 checagens de soma (linha × coluna × total) consistentes na tabela de lacunas Oferta Lançada.',
    ok, viz,
  });
}

// CROSS_TABLE_MISMATCH — totais s121 × s122
mrkFindings.push({
  id: 'mrk-total-121-122', type: 'CROSS_TABLE_MISMATCH', section: 'LACUNAS', slideRef: 's121 × s122',
  title: 'Total de oferta diverge entre tabelas da mesma Z.I.',
  detail: 'A Oferta Lançada soma 12.143 na tabela por m² (s121) mas 5.478 na tabela por R$/m² (s122). Mesma Z.I. deveria ter o mesmo total.',
  gabarito: 'Ajustar com os valores que pedi na tabela de lacunas geral',
  ok: false,
  viz: {
    kind: 'sidebyside', leftLabel: 'Slide 121 (por m²)', rightLabel: 'Slide 122 (por R$/m²)',
    rows: [
      { label: 'Oferta Lançada — Total', left: 12143, right: 5478, mismatch: true },
      { label: 'Oferta Final — Total', left: 1196, right: 1196, mismatch: false },
    ],
  },
});

// BINNING_RULE — furo de faixa R$/m² no s122
{
  const bins = [
    { label: 'Até R$ 7.500', from: 0, to: 7500 },
    { label: 'R$ 7.501–8.000', from: 7501, to: 8000 },
    { label: 'R$ 8.001–8.500', from: 8001, to: 8500 },
    { label: 'R$ 8.501–9.000', from: 8501, to: 9000 },
    { label: 'R$ 9.001–9.500', from: 9001, to: 9500 },
    { label: 'Acima de R$ 10.000', from: 10000, to: null },
  ];
  const gap = detectBinGap(bins);
  mrkFindings.push({
    id: 'mrk-bin-s122', type: 'BINNING_RULE', section: 'LACUNAS', slideRef: 's122',
    title: 'Furo na sequência de faixas de R$/m²',
    detail: 'As faixas saltam de “9.001–9.500” direto para “acima de 10.000”: a faixa 9.501–10.000 não existe.',
    ok: false,
    viz: { kind: 'binrange', unit: 'R$/m²', bins, gapAfterIndex: gap.gapAfterIndex, gapDescription: gap.description },
  });
}

// WRONG_CONTEXT (BETA), VALUE_PLAUSIBILITY (BETA), etc.
mrkFindings.push(
  {
    id: 'mrk-wrongctx-s27', type: 'WRONG_CONTEXT', section: 'MERCADO', slideRef: 's27',
    title: 'Dados de outro estudo (β)', ok: false,
    detail: 'Texto indica dados copiados de outro estudo (cidade diferente da do projeto).',
    gabarito: 'Essas informações são do estudo do Brooklin, por favor corrigir',
    viz: { kind: 'text', location: 'Corpo do slide', evidence: 'referência a “Brooklin” (estudo é Tancredo/Guarulhos)' },
  },
  {
    id: 'mrk-plaus-s76', type: 'VALUE_PLAUSIBILITY', section: 'MERCADO', slideRef: 's76',
    title: 'Monotonicidade quebrada (β)', ok: false,
    detail: 'Unidade maior, com 2 vagas, tem valor de m² menor — inconsistência de plausibilidade a verificar.',
    gabarito: 'Verificar, unidade maior com 2 vagas e valor do m² menor, está estranho',
    viz: { kind: 'text', location: 'Tabela de empreendimentos', evidence: 'm² maior × preço menor' },
  },
  {
    id: 'mrk-city', type: 'CITY_NAME', section: 'GLOBAL', slideRef: 's3',
    title: 'Nome de cidade confere', ok: true,
    detail: 'Nome da cidade no slide corresponde ao projeto (Guarulhos/SP).',
    viz: { kind: 'text', location: 'Título', evidence: 'Guarulhos - SP' },
  },
  {
    id: 'mrk-spelling', type: 'SPELLING', section: 'GLOBAL', slideRef: 's44',
    title: 'Possível erro de ortografia', ok: false,
    detail: 'Palavra sinalizada pela IA como possível erro de português.',
    viz: { kind: 'text', location: 'Corpo do slide', evidence: '“anális” → “análise”' },
  },
  {
    id: 'mrk-coherence', type: 'COHERENCE', section: 'MERCADO', slideRef: 's70',
    title: 'Número do texto bate com a tabela', ok: true,
    detail: 'Valores citados no texto descritivo coincidem com a tabela do slide.',
    viz: { kind: 'text', location: 'Parágrafo + tabela' },
  },
  {
    id: 'mrk-required', type: 'REQUIRED_NOTE', section: 'ABSORCAO', slideRef: 's90',
    title: 'Nota obrigatória de absorção (β)', ok: false,
    detail: 'Slide de absorção deveria conter a nota padrão “desconsidera absorção de 2ª moradia”.',
    viz: { kind: 'text', location: 'Rodapé' },
  },
  {
    id: 'mrk-exclusion', type: 'EXCLUSION_RULE', section: 'LACUNAS', slideRef: 's123',
    title: 'Exclusões de lacunas (β)', ok: true,
    detail: 'Gardens, Duplex e Coberturas aparentam estar excluídos da base de lacunas.',
    viz: { kind: 'text', evidence: 'Gardens/Duplex/Coberturas: não encontrados na base' },
  },
  {
    id: 'mrk-totalseq', type: 'TOTALS_EQUALITY', section: 'MERCADO', slideRef: 's72', ok: true,
    title: 'Totais de oferta batem (β)',
    detail: 'Total de oferta lançada = soma por tipologia na consolidada.',
    viz: { kind: 'text' },
  },
  {
    id: 'mrk-mapchart', type: 'MAP_CHART_MISMATCH', section: 'SOCIO', slideRef: 's42',
    title: 'Mapa × gráfico (demo — motor pendente)', ok: false,
    detail: 'Comparar valores do mapa de renda com o gráfico correspondente exige visão de alta resolução (planejado).',
    viz: { kind: 'text', location: 'Mapa de renda + gráfico' },
  },
);

export const STUDIES: StudyFixture[] = [
  { id: 'itajai', label: 'Itajaí/SC — Élio Winter', city: 'Itajaí - SC', type: 'Horizontal (lotes)', slides: 143, radii: '10/20/30 min', findings: itaFindings },
  { id: 'marka', label: 'Marka Prime — Guarulhos/SP', city: 'Guarulhos - SP', type: 'Vertical (8 torres)', slides: 165, radii: '10/15/30 min', findings: mrkFindings },
];
