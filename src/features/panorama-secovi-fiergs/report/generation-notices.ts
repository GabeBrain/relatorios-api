import { closingTypologyPriceRanges } from './editorial-contracts';
import { territorialReportView } from './territorial-projections';
import { territorialPriceRows, territorialTrend, territorialAnnualColumns, temporalGapBridges } from './territorial-selectors';
import { annualCompositionPublishable } from './annual-composition';
import type { PanoramaReportModel, ReportGenerationNotice } from '../types';
import { pointInsideTerritory } from '../lib/municipal-territory';
import { mcmvActivity } from './editorial-contracts';
import { createFiergsReportManifest, FIERGS_REDUNDANT_OFFICIAL_SLIDES, panoramaManifestFor } from './manifest';
import { granularPriceChartRows } from './price-chart';
import { observedDormitoryPriceGroup } from './dormitory-price-series';

type NoticeInput = Omit<ReportGenerationNotice, 'entity' | 'period' | 'affectedPages' | 'affectedOfficialSlides'> & {
  officialSlides?: number[];
};

function outputPages(report: PanoramaReportModel, officialSlides: number[] = []): number[] {
  if (report.scope.entity !== 'fiergs-rs' || !officialSlides.length) return [];
  const active = new Map<number,number[]>();
  for(const page of panoramaManifestFor(report))if(page.fiergsOfficialSlide!==undefined)active.set(page.fiergsOfficialSlide,[...(active.get(page.fiergsOfficialSlide)??[]),page.page]);
  const complete = new Map(createFiergsReportManifest(true).map((page) => [page.fiergsOfficialSlide, page.page]));
  return officialSlides.flatMap((slide) => {
    const pages=active.get(slide);
    if(pages)return pages;
    const page=complete.get(slide);
    return page===undefined?[]:[page];
  });
}

function dimensionalResiduals(report: PanoramaReportModel) {
  const metrics = [
    ['lançamentos', 'launchedUnits'],
    ['vendas líquidas', 'soldUnits'],
    ['oferta final', 'finalUnits'],
  ] as const;
  return metrics.flatMap(([label, key]) => {
    const projects = report.cube.projects.flatMap((project) => {
      const total = project[key];
      if (total === null || !project.typologies.length || project.typologies.some((row) => row[key] === null)) return [];
      const dimensional = project.typologies.reduce((sum, row) => sum + (row[key] ?? 0), 0);
      const delta = total - dimensional;
      return delta === 0 ? [] : [{ city: project.city, delta }];
    });
    return projects.length ? [{ label, projects }] : [];
  });
}

/** Uma única fonte de verdade para avisos visíveis no app e linhas da auditoria. */
export function buildGenerationNotices(report: PanoramaReportModel): ReportGenerationNotice[] {
  const entity = report.scope.entity ?? 'secovi-sp';
  const period = `${report.scope.startQuarter ?? 'histórico'}–${report.scope.endQuarter}`;
  const noticeInputs: NoticeInput[] = [];
  const add = (notice: NoticeInput) => noticeInputs.push(notice);
  if (report.scope.entity === 'fiergs-rs' && report.provenance.completedCities.length === report.scope.cities.length) {
    const slides = (['launches', 'sales'] as const).flatMap((kind) => {
      const activity = mcmvActivity(report, kind);
      return activity.known && !activity.active ? kind === 'launches' ? [15,16] : [27,28] : [];
    });
    if (slides.length) add({ code: 'MCMV_ZERO_ACTIVITY_OMITTED', severity: 'info', indicator: 'Páginas MCMV',
      reason: 'Séries MCMV integralmente zeradas no recorte com cobertura disponível.', source: 'Séries classificadas de lançamentos/vendas',
      displayDecision: 'Páginas focadas em MCMV omitidas; zeros pontuais e vendas negativas são preservados.', officialSlides: slides });
  }
  if (report.territorial) {
    const omittedStructures=report.territorial.units.flatMap(({unit,data})=>{
      const omitted=[];
      if(!data.granular.offerByTypology.some((r)=>(r.finalUnits??0)>0))omitted.push('matriz de oferta por área/tipologia');
      if(!closingTypologyPriceRanges(territorialReportView(report,unit.id)).length)omitted.push('extremos de preço');
      if(data.closingFacts.horizontal.projects===0)omitted.push('quadros horizontais');
      return omitted.length?[`${unit.label}: ${omitted.join(', ')}`]:[];
    });
    if(omittedStructures.length)add({code:'TERRITORIAL_STRUCTURES_OMITTED',severity:'info',indicator:'Páginas específicas dos territórios',reason:omittedStructures.join('; '),source:'Estrutura publicável por unidade territorial',displayDecision:'Famílias sem estrutura/atividade aplicável não geram páginas vazias; membros e fatos continuam na auditoria.'});
    const notApplicable=report.territorial.nonApplicableSegments??[];
    if(notApplicable.length)add({code:'TERRITORIAL_SEGMENT_NOT_APPLICABLE',severity:'info',indicator:'Aplicabilidade territorial por segmento',reason:notApplicable.map(({city,segment})=>`${city}: sem universo ${segment==='vertical'?'vertical':'horizontal'} no cadastro completo e sem observações temporais desse segmento`).join('; '),source:'Cubo municipal completo, rejeições e séries observadas',displayDecision:'O segmento inexistente não invalida as observações dos outros membros do grupo. Nenhum valor ausente é preenchido com zero; as reconciliações mantêm seus estados.'});
    const bridged=panoramaManifestFor(report).filter(p=>p.territorialKind==='trend').flatMap(p=>territorialTrend(report,p).series.flatMap(s=>temporalGapBridges(s.plotted).map(g=>`${p.title} / ${s.unit.label}: ${g.from.quarter}–${g.to.quarter}`)));
    if(bridged.length)add({code:'TERRITORIAL_GAP_BRIDGES',severity:'info',indicator:'Intervalos sem observação nas séries',reason:bridged.join('; '),source:'Pontos realmente observados das séries territoriais',displayDecision:'Trecho tracejado liga observações separadas por lacuna. Sem interpolação de números, pontos novos, alteração de cobertura ou uso da ponte no cálculo de comparativos.'});
    const noShares=report.territorial.units.filter(({data})=>!data.closingFacts.vertical.finalUnits);
    if(noShares.length)add({code:'TERRITORIAL_EMPTY_PERCENTAGES',severity:'info',indicator:'Colunas percentuais territoriais',reason:noShares.map(({unit})=>unit.label).join(', '),source:'Oferta final da unidade territorial',displayDecision:'Colunas sem denominador positivo omitidas nas tabelas comparativas; quantidades e zeros preservados.'});
    const emptyPrices=[...new Set(['meter-standard','meter-typology','ticket-standard','ticket-typology'].flatMap((kind)=>territorialPriceRows(report,kind).omittedLabels))];
    if(emptyPrices.length)add({code:'TERRITORIAL_EMPTY_PRICE_CATEGORIES',severity:'info',indicator:'Categorias de preço nos comparativos',reason:emptyPrices.join(', '),source:'Indicadores observados por unidade territorial',displayDecision:'Categorias sem observação em todas as unidades não aparecem no gráfico; zeros observados não são removidos.'});
    const annualOmissions=panoramaManifestFor(report).filter((p)=>p.territorialKind==='trend').flatMap((p)=>{
      const model=territorialTrend(report,p);const total=Math.max(0,(model.annual[0]?.values.length??0)-1);const visible=territorialAnnualColumns(model.annual).length;
      return total>visible?[`${p.title}: ${total-visible} comparação(ões) anual(is) sem base observada/atividade compatível`]:[];
    });
    if(annualOmissions.length)add({code:'TERRITORIAL_ANNUAL_COMPARISONS_OMITTED',severity:'info',indicator:'Comparativos anuais territoriais',reason:annualOmissions.join('; '),source:'Cobertura anual por território e regra de comparação observada',displayDecision:'Colunas sem comparação válida e quadros integralmente sem comparação omitidos; séries, zeros observados e negativos preservados na auditoria.'});
    const missing = report.territorial.checks.filter((r)=>r.status==='unavailable');
    const differences = report.territorial.checks.filter((r)=>r.status==='different');
    add({code:'TERRITORIAL_COMPOSITION',severity:'info',indicator:'Territórios comparados',reason:report.territorial.units.map(({unit})=>`${unit.label}: ${unit.cities.join(', ')}`).join('; '),source:'Seleção explícita do estudo',displayDecision:report.scope.presentation?.layout==='integrated'?'Relatório único: consolidado seguido de suas visões por cidade/grupo; membros completos na página de cidades. Mapas, maturidade e composição anual permanecem consolidados.':'Até três séries ou blocos; matrizes densas em páginas específicas. Mapas, maturidade e composição anual permanecem consolidados.'});
    if(missing.length)add({code:'TERRITORIAL_COVERAGE',severity:'info',indicator:'Cobertura dos comparativos',reason:`${missing.length} conferência(s) sem contraparte dimensional ou observação completa; a ausência não foi convertida em zero.`,source:'Matriz cidade → grupo → consolidado',displayDecision:'Lacunas preservadas nos gráficos e na auditoria; não representam igualdade comprovada.'});
    if(differences.length)add({code:'TERRITORIAL_DIFFERENCES',severity:'warning',indicator:'Reconciliação territorial',reason:`${differences.length} divergência(s) registrada(s) na matriz territorial.`,source:'Matriz de reconciliação',displayDecision:'Dados e divergências preservados na auditoria e nos alertas de consistência.'});
  }
  for(const block of report.annualCompositions??[]) {
    const omitted=block.years.filter((y)=>y.status!=='ready');
    if(omitted.length||block.unclassified||!annualCompositionPublishable(block))add({code:`ANNUAL_COMPOSITION_${block.metric.toUpperCase()}`,severity:'info',indicator:block.title,
      reason:`${block.unclassified} empreendimento(s) sem classificação observada no lançamento; anos não exibidos: ${omitted.map((y)=>`${y.year} (${y.status})`).join(', ')||'nenhum'}.`,source:'Padrão na competência do lançamento; quantidades e VGL do contrato homologado',displayDecision:annualCompositionPublishable(block)?'Categoria Não classificado preservada; anos sem base positiva e completa não são normalizados para100%.':'Família omitida por falta de classificação ou universo suficiente; dados brutos permanecem na auditoria.'});
  }
  const withoutStock = report.cube.projects.filter((p) => p.segment === 'Vertical').flatMap((p) => p.typologies)
    .filter((t) => (t.finalUnits ?? 0) <= 0 && t.averagePricePerMeter !== null && t.averagePricePerMeter > 0).length;
  if (withoutStock) add({ code: 'PRICE_RANGE_CLOSING_UNIVERSE', severity: 'info', indicator: 'Extremos de preço da oferta atual',
    reason: `${withoutStock} tipologia(s) com preço, sem estoque positivo, não participam dos extremos da oferta atual.`,
    source: 'Fotografia tipológica do fechamento · contrato D10', displayDecision: 'Histórico e outros indicadores permanecem intactos; não há piso de preço nem filtro especial de área.' });
  const outside = report.locations.filter((p) => !pointInsideTerritory(p, report.municipalTerritory));
  if (report.locations.length && !report.municipalTerritory) add({ code: 'MUNICIPAL_TERRITORY_UNAVAILABLE', severity: 'warning', indicator: 'Enquadramento municipal',
    reason: 'A referência territorial dos municípios não está disponível nesta geração.', source: 'Cartografia municipal IBGE', displayDecision: 'Coordenadas e indicadores são preservados; o mapa não é reenquadrado por pontos distantes.' });
  else if (outside.length) add({ code: 'MAP_POINTS_OUTSIDE_FRAME', severity: 'info', indicator: 'Enquadramento municipal',
    reason: `${outside.length} ponto(s) fora do enquadramento: ${outside.map((p) => `${p.name} (${p.projectKey ?? p.city ?? ''})`).join('; ')}.`,
    source: report.municipalTerritory!.source, displayDecision: 'Apenas a exibição no mapa é recortada; nenhum empreendimento é excluído dos indicadores.' });
  add({ code: 'CATEGORY_RATE_MEAN', severity: 'info', indicator: 'Média das taxas', reason: 'O agregado de disponibilidade é a média simples das categorias com taxa calculável; zeros observados entram, totais/subtotais e ausências não entram.',
    source: 'Contrato Finoti D09', displayDecision: 'Identificado como Média das taxas, sem alterar o denominador histórico das linhas.' });

  const identified = report.cube.projects.filter((p) => p.historyAudit?.identityMode === 'identified');
  const removed = identified.reduce((sum, p) => sum + p.historyAudit!.duplicates.reduce((n, d) => n + d.removed, 0), 0);
  const issues = identified.reduce((sum, p) => sum + p.historyAudit!.issues.length, 0);
  if (removed) add({ code: 'HISTORY_DUPLICATES_REMOVED', severity: 'info', indicator: 'Integridade do histórico',
    reason: `${removed} linha(s) histórica(s) equivalente(s) removida(s) antes das somas, preservando a identidade tipológica.`,
    source: 'history-identity-v1', displayDecision: 'Uma observação por identidade/conteúdo; originais e referências disponíveis na Auditoria CSV.' });
  if (issues) add({ code: 'HISTORY_INTEGRITY_BLOCKED', severity: 'warning', indicator: 'Integridade do histórico',
    reason: `${issues} ocorrência(s) de conflito, identidade, quantidade ou fotografia incompleta.`, source: 'history-identity-v1 / period-capacity-v1',
    displayDecision: 'Ocorrências preservadas para conferência nos alertas de consistência e na Auditoria CSV.' });
  if (report.scope.entity === 'fiergs-rs' && identified.length) {
    const unavailable = identified.filter((p) => !p.historyAudit!.registryComparable).length;
    add({ code: 'HISTORICAL_CAPACITY_DERIVED', severity: 'info', indicator: 'Capacidade no fechamento',
      reason: `Capacidade derivada das quantidades tipológicas da fotografia até o fechamento; ${unavailable} controle(s) cadastral(is) sem competência compatível.`,
      source: 'period-capacity-v1', displayDecision: 'Total derivado identificado na auditoria; conservação dimensional não substitui controle externo.' });
    const revised = identified.filter((p) => p.historyAudit!.releaseObservedUnits !== null
      && p.historyAudit!.capacityAtClosing !== null && p.historyAudit!.releaseObservedUnits !== p.historyAudit!.capacityAtClosing).length;
    if (revised) add({ code: 'CAPACITY_DIFFERS_FROM_ORIGINAL', severity: 'info', indicator: 'Competências da oferta',
      reason: `${revised} empreendimento(s) com quantidades diferentes entre o lançamento original e a fotografia de fechamento.`,
      source: 'period-capacity-v1', displayDecision: 'Bases temporais separadas; diferença não significa edição do histórico ou mudança desde a geração anterior.' });
    const lagged = identified.filter((p) => p.historyAudit!.closingMonth !== p.historyAudit!.requestedMonth).length;
    if (lagged) add({ code: 'CAPACITY_SNAPSHOT_LAGGED', severity: 'warning', indicator: 'Competência observada',
      reason: `${lagged} empreendimento(s) utilizam a última fotografia comum disponível anterior ao mês de fechamento.`,
      source: 'period-capacity-v1', displayDecision: 'Competência efetiva registrada por empreendimento na auditoria; sem preencher quantidades com dados futuros.' });
  }

  if (report.provenance.failedCities.length) {
    add({ code: 'CITY_COLLECTION_PARTIAL', severity: 'warning', indicator: 'Cobertura municipal',
      reason: `Não foi possível concluir a coleta em: ${report.provenance.failedCities.map((item) => item.city).join(', ')}.`,
      source: 'Proveniência da coleta Geobrain', displayDecision: 'O relatório permanece parcial; os municípios não concluídos não são preenchidos por estimativa.' });
  }
  const recoveredCities = report.provenance.cityCollectionAttempts?.filter((item) => item.recovered) ?? [];
  if (recoveredCities.length) {
    add({ code: 'CITY_COLLECTION_RECOVERED', severity: 'info', indicator: 'Recuperação da coleta',
      reason: `A coleta foi recuperada após nova tentativa em: ${recoveredCities.map(({ city, attempts }) => `${city} (${attempts} tentativas)`).join(', ')}.`,
      source: 'Proveniência das chamadas Geobrain', displayDecision: 'O município recuperado integra o recorte completo uma única vez.' });
  }
  for (const warning of report.launches.warnings) {
    add({ code: 'LAUNCH_SOURCE_WARNING', severity: 'warning', indicator: 'Lançamentos', reason: warning,
      source: 'building-with-history / auditoria de lançamentos', displayDecision: 'Preservar os valores observados e consultar a auditoria para o alcance.' });
  }
  if (!report.horizontalSeries.attributable) {
    add({ code: 'HORIZONTAL_SERIES_NOT_ATTRIBUTABLE', severity: 'warning', indicator: 'Séries do segmento horizontal',
      reason: report.horizontalSeries.reason, source: 'Política de elegibilidade do cubo',
      displayDecision: 'Séries horizontais incompatíveis com o universo aceito são omitidas; o consolidado não é reclassificado.' });
  }

  const vgvMissingLaunch = report.cube.projects.filter((project) => project.launchedVgvMillions === null);
  const vgvMissingFinal = report.cube.projects.filter((project) => project.finalVgvMillions === null);
  if (vgvMissingLaunch.length || vgvMissingFinal.length) {
    const missingUnits = vgvMissingLaunch.reduce((sum, project) => sum + (project.launchedUnits ?? 0), 0);
    add({ code: 'VGV_COVERAGE_PARTIAL', severity: 'warning', indicator: 'VGV lançado, final e vendido',
      reason: `Campos de VGV não observados: lançamento em ${vgvMissingLaunch.length} empreendimento(s) (${missingUnits.toLocaleString('pt-BR')} unidades associadas) e fechamento em ${vgvMissingFinal.length}.`,
      source: 'Cubo Geobrain por empreendimento; campos monetários de origem',
      displayDecision: 'Valores ausentes não são imputados; subtotais representam somente valores observados.' , officialSlides: [61] });
  }
  if (!report.granular.valueRangeAvailable) {
    add({ code: 'VALUE_RANGE_COLUMN_OMITTED', severity: 'info', indicator: 'Faixa de valor',
      reason: 'A fonte consultada não fornece campo nem regra autoritativa para classificar a faixa de valor.',
      source: 'Cubo Geobrain e contrato de dados', displayDecision: 'A coluna sem valores é omitida; nenhuma categoria é inferida.' });
  }
  if (report.sales.units.dataStatus === 'unavailable') {
    add({ code: 'SALES_PAGES_OMITTED', severity: 'warning', indicator: 'Séries de vendas',
      reason: 'A fonte temporal de vendas não retornou observações publicáveis para este recorte.',
      source: report.sales.units.source, displayDecision: 'As páginas de vendas sem dados foram retiradas; não foram substituídas por zeros.', officialSlides: [24, 26, 27, 28, 29, 31, 32, 33] });
  }
  if (report.prices.meter.dataStatus === 'unavailable') {
    add({ code: 'PRICE_SERIES_PAGE_OMITTED', severity: 'warning', indicator: 'Série temporal de R$/m²',
      reason: 'A fonte temporal não retornou observações de preço por metro quadrado para o recorte.',
      source: report.prices.meter.source, displayDecision: 'A página sem série foi retirada do arquivo.', officialSlides: [43] });
  }
  if (report.prices.meterByTypology.dataStatus === 'unavailable') {
    add({ code: 'TYPOLOGY_PRICE_PAGES_OMITTED', severity: 'warning', indicator: 'Séries de preço por tipologia',
      reason: 'Não há séries temporais observadas por número de dormitórios.',
      source: report.prices.meterByTypology.source, displayDecision: 'As páginas sem série foram retiradas do arquivo.', officialSlides: [44, 45, 46, 47] });
  }
  if (report.scope.entity === 'fiergs-rs' && report.prices.meterByTypology.dataStatus !== 'unavailable') {
    for (const bedroom of [1, 2, 3, 4]) {
      const group = observedDormitoryPriceGroup(report.prices.meterByTypology, bedroom);
      if (group) {
        const missing = group.series.filter(row => row.observed?.vertical === false);
        if (missing.length) add({ code: `DORMITORY_PRICE_GAPS_${bedroom}`, severity: 'info', indicator: `R$/m² · ${bedroom} dormitórios`,
          reason: `${missing.length} trimestre(s) sem observação vertical da própria tipologia: ${missing.map(row => row.quarter).join(', ')}.`,
          source: report.prices.meterByTypology.source, displayDecision: 'Lacunas mantidas no gráfico; ausência não é desenhada como preço zero e não conecta períodos sem observação.', officialSlides: [43 + bedroom] });
        continue;
      }
      add({ code: 'DORMITORY_PRICE_SERIES_PAGE_OMITTED', severity: 'info', indicator: `R$/m² · ${bedroom === 4 ? '4 ou mais' : bedroom} dormitórios`,
        reason: 'Não há observações finitas da própria tipologia na série do intervalo selecionado.', source: report.prices.meterByTypology.source,
        displayDecision: 'A página sem série foi omitida; não usa dados de outra tipologia nem imprime placeholder no estudo.', officialSlides: [43 + bedroom] });
    }
  }
  for (const dimension of ['pattern', 'typology'] as const) {
    const sourceRows = dimension === 'pattern' ? report.granular.pricesByStandard : report.granular.pricesByTypology;
    if (!sourceRows.length) continue;
    const { omittedLabels } = granularPriceChartRows(report, dimension);
    if (!omittedLabels.length) continue;
    add({ code: 'PRICE_CHART_GROUPS_OMITTED', severity: 'info', indicator: dimension === 'pattern' ? 'Preço por padrão' : 'Preço por tipologia',
      reason: `Sem R$/m² observado para: ${omittedLabels.join(', ')}.`,
      source: dimension === 'typology' && report.scope.entity === 'fiergs-rs' ? 'Série temporal Geobrain por tipologia' : 'Cubo granular Geobrain',
      displayDecision: 'Somente essas categorias são omitidas do gráfico; zeros observados e outros indicadores disponíveis na tabela permanecem.',
      officialSlides: report.scope.entity === 'fiergs-rs' ? [dimension === 'pattern' ? 50 : 52] : [] });
  }
  if (!report.locations.length) {
    add({ code: 'MAP_PAGES_OMITTED', severity: 'warning', indicator: 'Mapas de localização',
      reason: 'Nenhum empreendimento do recorte tem coordenadas utilizáveis para representar no mapa.',
      source: 'Cubo Geobrain; latitude e longitude', displayDecision: 'As páginas de mapa sem marcadores foram retiradas.', officialSlides: [67, 68, 69] });
  }

  for (const residual of dimensionalResiduals(report)) {
    const delta = residual.projects.reduce((sum, project) => sum + project.delta, 0);
    add({ code: 'DIMENSION_RESIDUAL', severity: 'warning', indicator: residual.label,
      reason: `O total por empreendimento difere da soma das tipologias em ${residual.projects.length} empreendimento(s), nas cidades ${[...new Set(residual.projects.map((item) => item.city))].join(', ')}; saldo não classificado: ${delta.toLocaleString('pt-BR')} unidade(s).`,
      source: 'Cubo granular Geobrain comparado às tipologias do mesmo empreendimento',
      displayDecision: 'O resíduo não é redistribuído entre tipologias; totais e subtotais permanecem identificáveis.', officialSlides: [35, 36, 37] });
  }
  const atypicalAvailability = [...report.granular.offerByStandard, ...report.granular.offerByTypology]
    .filter((row) => row.kind === 'row' && row.availability !== null && (row.availability < 0 || row.availability > 100));
  if (atypicalAvailability.length) {
    add({ code: 'AVAILABILITY_OUTSIDE_REFERENCE_RANGE', severity: 'warning', indicator: 'Disponibilidade por dimensão',
      reason: `${atypicalAvailability.map((row) => `${row.label}: ${row.availability?.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`).join('; ')}. O percentual excede a faixa de referência de 0–100%.`,
      source: 'Oferta final e oferta lançada histórica da mesma dimensão',
      displayDecision: 'O valor é exibido sem truncamento; a diferença permanece visível e registrada.' , officialSlides: [36, 37] });
  }

  const negativeProjects = report.cube.projects.filter((project) => (project.soldUnits ?? 0) < 0 || project.typologies.some((row) => (row.soldUnits ?? 0) < 0));
  if (negativeProjects.length) {
    add({ code: 'NEGATIVE_NET_SALES_OBSERVED', severity: 'info', indicator: 'Vendas líquidas',
      reason: `Há valor(es) líquido(s) negativo(s) em ${negativeProjects.length} empreendimento(s); o sinal foi mantido conforme observado.`,
      source: 'Fotografia granular Geobrain por empreendimento/tipologia',
      displayDecision: 'Valores negativos são exibidos e participam dos totais; nenhuma causa transacional é inferida.' });
  }

  for (const row of report.reconciliation.rows.filter((item) => item.status !== 'match')) {
    add({ code: row.critical ? 'CRITICAL_RECONCILIATION' : 'RECONCILIATION_DIFFERENCE',
      severity: row.critical ? 'critical' : 'warning', indicator: row.metricId,
      reason: `Reconciliação ${row.status}: total canônico ${row.canonicalTotal ?? 'indisponível'}, dimensional ${row.dimensionalTotal ?? 'indisponível'}, delta ${row.delta ?? 'indisponível'} (tolerância ${row.tolerance}).`,
      source: row.source, displayDecision: row.critical ? 'Confira o alerta de consistência antes de continuar o download; a diferença permanece na auditoria.' : 'A diferença permanece explícita na auditoria.',
      officialSlides: [] });
  }

  if (report.scope.entity === 'fiergs-rs') {
    const unknownProducts = report.cube.rejections.filter((item) => item.reason === 'subtipo_horizontal_indefinido' || item.reason === 'segmento_desconhecido');
    if (unknownProducts.length) add({ code: 'UNCLASSIFIED_PRODUCTS_EXCLUDED', severity: 'warning', indicator: 'Classificação de produtos',
      reason: `${unknownProducts.length} empreendimento(s) recusado(s) por falta de classificação autoritativa, nas cidades ${[...new Set(unknownProducts.map((item) => item.city))].join(', ')}.`,
      source: 'Política FIERGS e rejeições do cubo', displayDecision: 'Itens não entram em produtos por inferência; IDs e motivos permanecem no CSV para revisão da fonte.' });
    const activeSlides = new Set(panoramaManifestFor(report).map((page) => page.fiergsOfficialSlide));
    const omittedSlides = createFiergsReportManifest(true).filter((page) => !activeSlides.has(page.fiergsOfficialSlide)).map((page) => page.fiergsOfficialSlide!);
    if (omittedSlides.length) add({ code: 'SCOPE_EDITORIAL_PAGES_OMITTED', severity: 'info', indicator: 'Páginas aplicáveis ao recorte',
      reason: `O manifesto omitiu as lâminas oficiais ${omittedSlides.join(', ')} por ausência de estrutura publicável ou comparação municipal não aplicável.`,
      source: 'Manifesto comparado ao cubo e ao escopo efetivo', displayDecision: 'As omissões constam nos avisos e CSV; zeros observados e divergências não são suprimidos.', officialSlides: omittedSlides });
    if (report.scope.cities.length > 10) add({ code: 'CITY_PAGES_PAGINATED', severity: 'info', indicator: 'Recorte municipal',
      reason: `${report.scope.cities.length} municípios: lista territorial e comparativos foram divididos em páginas para preservar todos os municípios.`,
      source: 'Escopo selecionado e manifesto', displayDecision: 'Cada página municipal conserva o denominador do conjunto completo.', officialSlides: [7, 19, 31] });
    const locationKeys = new Set(report.locations.map((location) => location.projectKey));
    const missingCoordinates = report.cube.projects.filter((project) => !locationKeys.has(project.key));
    if (report.locations.length && missingCoordinates.length) add({ code: 'MAP_COORDINATE_COVERAGE_PARTIAL', severity: 'warning', indicator: 'Cobertura geográfica',
      reason: `${missingCoordinates.length} empreendimento(s) sem coordenada utilizável; permanecem nos indicadores.`,
      source: 'Cubo e marcadores geográficos', displayDecision: 'Os mapas mostram apenas coordenadas válidas; contagens e estoque mantêm todo o universo.', officialSlides: [67, 68, 69] });
    add({ code: 'EDITORIAL_DUPLICATE_SLIDES_REMOVED', severity: 'info', indicator: 'Sequência editorial',
      reason: `As lâminas oficiais ${[...FIERGS_REDUNDANT_OFFICIAL_SLIDES].join(', ')} repetiam conteúdo já presente no estudo e foram removidas do manifesto ativo.`,
      source: 'Manifesto editorial FIERGS comparado às páginas do estudo de referência',
      displayDecision: 'Uma ocorrência de cada análise permanece no PDF/PPT; contagens, sumário e auditoria usam a mesma sequência.', officialSlides: [...FIERGS_REDUNDANT_OFFICIAL_SLIDES] });
    const launchCoverageKnown = report.cube.projects.some((project) => project.releaseQuarter !== undefined) || report.provenance.completedCities.length > 0;
    if (launchCoverageKnown) {
      const quarterProjects = report.cube.projects.filter((project) => project.segment === 'Vertical' && project.releaseQuarter === report.scope.endQuarter);
      const missingSlides: number[] = [];
      if (!quarterProjects.length) missingSlides.push(10, 13, 17, 21);
      else {
        if (!quarterProjects.some((project) => project.launchedUnits !== null)) missingSlides.push(13);
        if (!quarterProjects.some((project) => project.typologies.some((row) => row.launchedUnits !== null))) missingSlides.push(17);
        if (!quarterProjects.some((project) => project.launchedVgvMillions !== null)) missingSlides.push(21);
      }
      if(!quarterProjects.length || quarterProjects.every(p=>p.launchedUnits===0)) missingSlides.push(19);
      if (missingSlides.length) add({ code: 'LAUNCH_DIMENSION_PAGES_OMITTED', severity: 'warning', indicator: 'Distribuições de lançamentos',
        reason: `Sem linhas dimensionais observáveis para as lâminas oficiais ${missingSlides.join(', ')} no trimestre final do recorte.`,
        source: 'Cubo granular Geobrain e proveniência municipal',
        displayDecision: 'As páginas de distribuição sem linhas são omitidas; a série trimestral agregada permanece e zero observado não é removido.', officialSlides: missingSlides });
    }
    if (!report.granular.offerByTypology.some((row) => row.launchedUnits !== null || row.finalUnits !== null || row.soldUnits !== null)) add({ code: 'TYPOLOGY_OFFER_PAGES_OMITTED', severity: 'warning', indicator: 'Oferta por tipologia',
      reason: 'O cubo do recorte não contém linhas tipológicas publicáveis para oferta.', source: 'Cubo granular Geobrain',
      displayDecision: 'As páginas sem valores observáveis são omitidas; nenhum zero é inferido.', officialSlides: [36, 57] });
    if (!report.granular.pricesByTypology.some((row) => [row.averageTicket, row.averageArea, row.averagePricePerMeter].some((value) => value !== null))) add({ code: 'TYPOLOGY_PRICE_RANGE_PAGE_OMITTED', severity: 'warning', indicator: 'Faixa de preços por tipologia',
      reason: 'O cubo do recorte não contém linhas tipológicas com valores para compor esta página.', source: 'Cubo granular Geobrain',
      displayDecision: 'A página sem valores observáveis é omitida.', officialSlides: [58] });
    if (!report.granular.vgv.some((row) => [row.launchedUnits, row.finalUnits, row.soldUnits, row.launchedVgvMillions, row.finalVgvMillions, row.soldVgvMillions].some((value) => value !== null))) add({ code: 'VGV_PAGE_OMITTED', severity: 'warning', indicator: 'VGV por padrão',
      reason: 'O cubo do recorte não contém linhas agregadas para compor o quadro de VGV.', source: 'Cubo granular Geobrain',
      displayDecision: 'A página sem estrutura de dados é omitida.', officialSlides: [61] });
    const annualRows = report.annualAreaIvv ?? [];
    const annualReady = annualRows.some((row) => row.kind === 'row') && annualRows.some((row) => row.kind === 'total')
      && annualRows.every((row) => [row.previousUnits, row.finalUnits, row.launchedUnits, row.soldUnits, row.ivv].every((value) => value !== null && Number.isFinite(value)));
    if (!annualReady) add({ code: 'ANNUAL_AREA_IVV_PAGE_OMITTED', severity: 'info', indicator: 'IVV anual por faixa de área',
      reason: 'A série anual não tem cobertura completa para todas as linhas e o total no período solicitado.',
      source: 'Fonte temporal anual por faixa de área', displayDecision: 'A página é retirada do arquivo, sem placeholder vazio.', officialSlides: [41] });
  }

  return noticeInputs.map(({ officialSlides, ...notice }) => ({ ...notice, entity, period,
    affectedPages: outputPages(report, officialSlides), affectedOfficialSlides: officialSlides ?? [] }));
}
