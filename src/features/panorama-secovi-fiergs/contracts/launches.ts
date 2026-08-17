import type { MetricContract } from '../types';

export const LAUNCH_CONTRACTS: MetricContract[] = [
  { id: 'launch.projects.quarter.type', title: 'Empreendimentos lançados por trimestre', unit: 'count', dimensions: ['quarter', 'segment'], source: 'building-with-history / release_date', formula: 'Contagem distinta de empreendimento por trimestre de lançamento.', status: 'assumed', tolerance: { absolute: 0 }, consumers: [12, 13, 14] },
  { id: 'launch.projects.quarter.vertical_standard', title: 'Empreendimentos verticais por padrão', unit: 'count', dimensions: ['quarter', 'standard'], source: 'building-with-history / typologies_history.pattern', formula: 'Econômico e demais padrões no período.', status: 'assumed', tolerance: { absolute: 0 }, consumers: [15] },
  { id: 'launch.units.quarter.type', title: 'Unidades lançadas por trimestre', unit: 'count', dimensions: ['quarter', 'segment'], source: 'temporal-analysis-city/releases ou histórico granular', formula: 'Soma de unidades lançadas no trimestre.', status: 'assumed', tolerance: { absolute: 0 }, consumers: [12, 13, 16] },
  { id: 'launch.units.quarter.vertical_standard', title: 'Unidades verticais por padrão', unit: 'count', dimensions: ['quarter', 'standard'], source: 'releases / histórico granular', formula: 'Soma por padrão no período.', status: 'assumed', tolerance: { absolute: 0 }, consumers: [17] },
  { id: 'launch.vgv.quarter.type', title: 'VGV lançado por trimestre', unit: 'currency_millions', dimensions: ['quarter', 'segment'], source: 'histórico granular', formula: 'Unidades × preço de lançamento por produto.', status: 'open_method', tolerance: { absolute: 0.11 }, consumers: [12, 13, 18] },
  { id: 'launch.vgv.quarter.vertical_standard', title: 'VGV vertical por padrão', unit: 'currency_millions', dimensions: ['quarter', 'standard'], source: 'histórico granular', formula: 'Agregação de VGV por padrão.', status: 'open_method', tolerance: { absolute: 0.11 }, consumers: [19] },
  { id: 'launch.mcmv.year.share', title: 'Participação MCMV', unit: 'percent', dimensions: ['year'], source: 'metodologia de analista', formula: 'Ainda não aprovada; não inferir por padrão.', status: 'open_method', tolerance: { absolute: 0.1 }, consumers: [15, 17, 19] },
  { id: 'launch.variation.yoy', title: 'Variação anual comparável', unit: 'percent', dimensions: ['metric', 'segment'], source: 'derivada', formula: '(valor atual / valor anterior) - 1.', status: 'reconciled', tolerance: { absolute: 0.1 }, consumers: [12, 13] },
  { id: 'launch.annual.total', title: 'Total anual de lançamentos', unit: 'count', dimensions: ['year', 'metric', 'segment'], source: 'derivada', formula: 'Soma dos trimestres disponíveis no ano.', status: 'reconciled', tolerance: { absolute: 0 }, consumers: [13] },
];

export const contractById = (id: string) => LAUNCH_CONTRACTS.find((contract) => contract.id === id);
