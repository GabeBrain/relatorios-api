import type { PanoramaReportModel, ReportGenerationNotice } from '../types';
import { createFiergsReportManifest, FIERGS_REDUNDANT_OFFICIAL_SLIDES, panoramaManifestFor } from './manifest';

type NoticeInput = Omit<ReportGenerationNotice, 'entity' | 'period' | 'affectedPages' | 'affectedOfficialSlides'> & {
  officialSlides?: number[];
};

function outputPages(report: PanoramaReportModel, officialSlides: number[] = []): number[] {
  if (report.scope.entity !== 'fiergs-rs' || !officialSlides.length) return [];
  const active = new Map(panoramaManifestFor(report).map((page) => [page.fiergsOfficialSlide, page.page]));
  const complete = new Map(createFiergsReportManifest(true).map((page) => [page.fiergsOfficialSlide, page.page]));
  return officialSlides.flatMap((slide) => {
    const page = active.get(slide) ?? complete.get(slide);
    return page === undefined ? [] : [page];
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

  if (report.provenance.failedCities.length) {
    add({ code: 'CITY_COLLECTION_PARTIAL', severity: 'warning', indicator: 'Cobertura municipal',
      reason: `Não foi possível concluir a coleta em: ${report.provenance.failedCities.map((item) => item.city).join(', ')}.`,
      source: 'Proveniência da coleta GeoBrain', displayDecision: 'O relatório permanece parcial; os municípios não concluídos não são preenchidos por estimativa.' });
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
      source: 'Cubo GeoBrain por empreendimento; campos monetários de origem',
      displayDecision: 'Valores ausentes não são imputados; subtotais representam somente valores observados.' , officialSlides: [61] });
  }
  if (!report.granular.valueRangeAvailable) {
    add({ code: 'VALUE_RANGE_COLUMN_OMITTED', severity: 'info', indicator: 'Faixa de valor',
      reason: 'A fonte consultada não fornece campo nem regra autoritativa para classificar a faixa de valor.',
      source: 'Cubo GeoBrain e contrato de dados', displayDecision: 'A coluna sem valores é omitida; nenhuma categoria é inferida.' });
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
  if (!report.locations.length) {
    add({ code: 'MAP_PAGES_OMITTED', severity: 'warning', indicator: 'Mapas de localização',
      reason: 'Nenhum empreendimento do recorte tem coordenadas utilizáveis para representar no mapa.',
      source: 'Cubo GeoBrain; latitude e longitude', displayDecision: 'As páginas de mapa sem marcadores foram retiradas.', officialSlides: [67, 68, 69] });
  }

  for (const residual of dimensionalResiduals(report)) {
    const delta = residual.projects.reduce((sum, project) => sum + project.delta, 0);
    add({ code: 'DIMENSION_RESIDUAL', severity: 'warning', indicator: residual.label,
      reason: `O total por empreendimento difere da soma das tipologias em ${residual.projects.length} empreendimento(s), nas cidades ${[...new Set(residual.projects.map((item) => item.city))].join(', ')}; saldo não classificado: ${delta.toLocaleString('pt-BR')} unidade(s).`,
      source: 'Cubo granular GeoBrain comparado às tipologias do mesmo empreendimento',
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
      source: 'Fotografia granular GeoBrain por empreendimento/tipologia',
      displayDecision: 'Valores negativos são exibidos e participam dos totais; nenhuma causa transacional é inferida.' });
  }

  for (const row of report.reconciliation.rows.filter((item) => item.status !== 'match')) {
    add({ code: row.critical ? 'CRITICAL_RECONCILIATION' : 'RECONCILIATION_DIFFERENCE',
      severity: row.critical ? 'critical' : 'warning', indicator: row.metricId,
      reason: `Reconciliação ${row.status}: total canônico ${row.canonicalTotal ?? 'indisponível'}, dimensional ${row.dimensionalTotal ?? 'indisponível'}, delta ${row.delta ?? 'indisponível'} (tolerância ${row.tolerance}).`,
      source: row.source, displayDecision: row.critical ? 'Exportação bloqueada até a divergência crítica ser resolvida.' : 'A diferença permanece explícita na auditoria.',
      officialSlides: [] });
  }

  if (report.scope.entity === 'fiergs-rs') {
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
      if (missingSlides.length) add({ code: 'LAUNCH_DIMENSION_PAGES_OMITTED', severity: 'warning', indicator: 'Distribuições de lançamentos',
        reason: `Sem linhas dimensionais observáveis para as lâminas oficiais ${missingSlides.join(', ')} no trimestre final do recorte.`,
        source: 'Cubo granular GeoBrain e proveniência municipal',
        displayDecision: 'As páginas de distribuição sem linhas são omitidas; a série trimestral agregada permanece e zero observado não é removido.', officialSlides: missingSlides });
    }
    if (!report.granular.offerByTypology.some((row) => row.launchedUnits !== null || row.finalUnits !== null || row.soldUnits !== null)) add({ code: 'TYPOLOGY_OFFER_PAGES_OMITTED', severity: 'warning', indicator: 'Oferta por tipologia',
      reason: 'O cubo do recorte não contém linhas tipológicas publicáveis para oferta.', source: 'Cubo granular GeoBrain',
      displayDecision: 'As páginas sem valores observáveis são omitidas; nenhum zero é inferido.', officialSlides: [36, 57] });
    if (!report.granular.pricesByTypology.some((row) => [row.averageTicket, row.averageArea, row.averagePricePerMeter].some((value) => value !== null))) add({ code: 'TYPOLOGY_PRICE_RANGE_PAGE_OMITTED', severity: 'warning', indicator: 'Faixa de preços por tipologia',
      reason: 'O cubo do recorte não contém linhas tipológicas com valores para compor esta página.', source: 'Cubo granular GeoBrain',
      displayDecision: 'A página sem valores observáveis é omitida.', officialSlides: [58] });
    if (!report.granular.vgv.some((row) => [row.launchedUnits, row.finalUnits, row.soldUnits, row.launchedVgvMillions, row.finalVgvMillions, row.soldVgvMillions].some((value) => value !== null))) add({ code: 'VGV_PAGE_OMITTED', severity: 'warning', indicator: 'VGV por padrão',
      reason: 'O cubo do recorte não contém linhas agregadas para compor o quadro de VGV.', source: 'Cubo granular GeoBrain',
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
