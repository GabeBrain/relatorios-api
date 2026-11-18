import { maceioCities, maceioPeriod, maceioReference, type MaceioSelection } from './model';
import type { MaceioGenerationState } from './useMaceioMarket';
import { buildMaceioLaunchSeries, buildMaceioPattern } from './intro-data';
import { buildMaceioMarketSlide, maceioSourceMonths, type SlideSource } from './market-slides-data';
import { buildOfferPriceSlide } from './offer-price-data';
import { buildRemainingSlide } from './remaining-data';
import { buildCagedSlide } from './caged';
import { maceioMonetaryPolicy } from './criteria';
import { auditMaceioSource } from './source-audit';

export type DiagnosticGeneration = Pick<MaceioGenerationState, 'phase' | 'startedAt' | 'finishedAt' | 'blueprint' | 'report' | 'intro'>;
type Status = 'available' | 'source-pending' | 'method-pending' | 'editorial-review' | 'not-implemented';
interface DiagnosticSlide { number: number; title: string; status: Status; issue: string | null; values: unknown }

/** Only calculated slide aggregates and explicit source metadata leave this boundary. */
export function buildMaceioDiagnostic(selection: MaceioSelection, state: DiagnosticGeneration) {
  const reference = maceioReference(selection.periodicity), intro = state.intro ?? null;
  const slides: DiagnosticSlide[] = reference.slides.map(definition => {
    const page = definition.number;
    const base: DiagnosticSlide = { number: page, title: definition.title, status: 'editorial-review', issue: null, values: null };
    const calculated = (value: { issue: string | null }, methodPending = false): DiagnosticSlide => ({
      ...base, status: methodPending ? 'method-pending' : value.issue ? 'source-pending' : 'available', issue: value.issue, values: value,
    });
    if (page >= 9 && page <= 14) return calculated(buildCagedSlide(page, selection, intro?.caged));
    if (page === 17) return calculated(buildMaceioPattern(selection, intro));
    if (page >= 16 && page <= 20) return calculated(buildMaceioLaunchSeries(page, selection, intro));
    if (page >= 21 && page <= 40 && ![29, 39].includes(page)) {
      const value = buildMaceioMarketSlide(page, selection, intro?.slides ?? null, maceioMonetaryPolicy(selection));
      // No INCC series is silently selected or presented as homologated.
      return calculated(value, value.money && maceioMonetaryPolicy(selection) === 'unconfirmed');
    }
    if (page >= 41 && page <= 60) {
      const value = buildOfferPriceSlide(page, selection, intro?.slides ?? null, 'stock-weighted');
      return value.kind === 'editorial' ? base : calculated(value);
    }
    if (page >= 61) {
      const value = buildRemainingSlide(page, selection, intro?.slides ?? null, 'stock-weighted');
      return value.kind === 'editorial' ? base : calculated(value);
    }
    return base;
  });
  const statuses: Status[] = ['available', 'source-pending', 'method-pending', 'editorial-review', 'not-implemented'];
  const sources = intro?.slides;
  const collectionStatus = (items: SlideSource[] | undefined) => ({ requested: items?.length ?? 0,
    completed: items?.filter(source => source.complete).length ?? 0,
    failed: items?.filter(source => !source.complete).length ?? 0,
    emptyCompleted: items?.filter(source => source.complete && !source.rows.length).length ?? 0 });
  const metadata = (items: SlideSource[] | undefined, closingOnly = false) => (items ?? []).map(source => ({
    city: source.city, metric: source.metric, group: source.group, complete: source.complete,
    rows: source.rows.length, issue: source.issue, failure: source.failure ?? null, endpoint: source.endpoint ?? null,
    zeroMonths: source.complete && source.metric!=='details'
      ? (closingOnly ? [maceioPeriod(selection).end.slice(0,7)] : maceioSourceMonths(selection)).filter(month=>!source.rows.some(row=>String(row.period).slice(0,7)===month)) : [],
    audit: auditMaceioSource(source, closingOnly ? [maceioPeriod(selection).end.slice(0, 7)] : maceioSourceMonths(selection)),
  }));
  return {
    schema: 'maceio-diagnostic-v1', generatedAt: state.finishedAt ?? new Date(state.startedAt).toISOString(),
    generationStatus: state.phase,
    selection: { uf: selection.uf, city: selection.city, territory: selection.territory, periodicity: selection.periodicity, year: selection.year, position: selection.position },
    period: maceioPeriod(selection), cities: [...maceioCities(selection.periodicity)],
    reference: { file: reference.file, sourceId: reference.sourceId, slideCount: reference.slideCount },
    homologated: false,
    auditVersion: 'maceio-source-audit-v1',
    collection: { vertical: collectionStatus(sources?.sources), horizontal: collectionStatus(sources?.horizontal), commercial: collectionStatus(sources?.commercial) },
    criteria: { prices: 'stock-weighted', monetaryIndex: maceioMonetaryPolicy(selection), monetaryBase: maceioPeriod(selection).end.slice(0, 7),
      horizontalUniverse: { excluded: ['Condomínio de Chácaras'], confirmedBy: 'Lucas, com confirmação do analista em 18/11/2026', reconciliation: 'full-source-before-exclusion', ambiguousClosed: 'pending-analyst-review' },
      emptyPeriods: 'completed-scoped-scan-as-zero; failed scans and missing numeric fields remain unavailable',
      patternGrouping: { Compacto:'Compactos', Econômico:'MCMV', Standard:'Médio Padrão', Médio:'Médio Padrão', 'Médio-Alto':'Médio Padrão', Alto:'Luxo', Luxo:'Luxo' } },
    summary: Object.fromEntries(statuses.map(status => [status, slides.filter(slide => slide.status === status).length])) as Record<Status, number>,
    slides,
    sources: {
      vertical: metadata(sources?.sources), horizontal: metadata(sources?.horizontal, true), commercial: metadata(sources?.commercial, true),
      launches: intro?.cities.map(city => ({ city: city.city, unitsComplete: city.unitsComplete, buildingsComplete: city.buildingsComplete, issues: city.issues, failures: city.failures ?? [] })) ?? [],
      caged: intro?.caged?.report ? { snapshotVersion: intro.caged.report.snapshotVersion, publishedThrough: intro.caged.report.publishedThrough, coverageStart: intro.caged.report.coverageStart } : null,
    },
    limits: ['Diagnóstico de conferência; não equivale à homologação.', 'Preços ponderados pelo estoque histórico; critério registrado para revisão do analista.', maceioMonetaryPolicy(selection) === 'INCC-DI' ? 'VGL/VGV corrigidos pelo INCC-DI até o mês de fechamento; série autorizada por Lucas em 17/11/2026.' : 'Valores corrigidos pelo INCC permanecem indisponíveis até a definição da série.'],
  };
}
