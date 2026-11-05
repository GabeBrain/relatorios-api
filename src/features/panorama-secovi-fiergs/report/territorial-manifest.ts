import { annualCompositionPublishable } from './annual-composition';
import type { ReportPageDefinition } from './manifest';
import type { PanoramaReportModel } from '../types';

export function territorialManifest(pages: ReportPageDefinition[], report: { scope?: { entity?: string; presentation?: PanoramaReportModel['scope']['presentation'] }; territorial?: PanoramaReportModel['territorial'] }): ReportPageDefinition[] {
  if (!report.territorial?.units.length || report.scope?.presentation?.mode !== 'comparison') return pages;
  const units = report.territorial.units;
  const output = pages.flatMap((page): ReportPageDefinition[] => {
    const official = page.fiergsOfficialSlide; const ref = page.contentReferenceSlide ?? page.referenceSlide;
    const id = `territorial-${official ?? ref}-${page.fiergsSlide ?? page.visualFamily}`;
    const dense = official !== undefined ? [57,58,61,63,64,65,66].includes(official) : [48,49,51].includes(ref);
    if (dense) return units.filter(({data}) => page.sectionId !== 'horizontal' || data.closingFacts.horizontal.projects > 0).map(({unit}) => ({ ...page,
      id: `${id}-${unit.id}`, territorialUnitId: unit.id, title: `${page.title} · ${unit.label}` }));
    const trend = official !== undefined ? [9,11,12,14,20,22,24,26,32,33,35,39,43,44,45,46,47].includes(official) : [14,16,18,23,24,40].includes(ref);
    if (trend) return [{ ...page, id, territorialKind: 'trend' }];
    if (official === 36 || official === 37 || official === undefined && [31,33,34].includes(ref)) return [{ ...page,id,
      territorialKind: official === 36 || ref === 34 ? 'offer-typology' : ref === 33 ? 'offer-cohort' : 'offer-standard' }];
    if (official !== undefined && [49,50,51,52].includes(official) || official === undefined && [36,37,38,39].includes(ref)) {
      const standard = official !== undefined ? [49,50].includes(official) : [38,39].includes(ref);
      const ticket = official !== undefined ? [49,51].includes(official) : [36,38].includes(ref);
      return [{...page,id,territorialKind:`${ticket?'ticket':'meter'}-${standard?'standard':'typology'}`}];
    }
    if (!official && page.cityComparison) return [];
    return [page];
  });
  if (report.scope?.entity === 'fiergs-rs') {
    const index=output.findIndex((p) => p.fiergsOfficialSlide===57);
    output.splice(index < 0 ? output.length : index,0,{page:0,referenceSlide:0,id:'territorial-offer-cohort',sectionId:'vertical',title:'Oferta final por ano de lançamento',intention:'Comparação territorial de coortes',visualFamily:'market-table',contractKeys:['granular.cohortsVertical'],methodologyStatus:'reconciled',territorialKind:'offer-cohort'});
  }
  return output.map((p,i) => ({...p,page:i+1}));
}

export function annualCompositionManifest(pages:ReportPageDefinition[],blocks?:PanoramaReportModel['annualCompositions']):ReportPageDefinition[]{
  const applicable=blocks?.filter(annualCompositionPublishable)??[];
  if(!applicable.length)return pages;
  const output=[...pages]; const last=output.reduce((n,p,i)=>p.sectionId==='launches'?i:n,-1);
  output.splice(last+1,0,...applicable.map((b)=>({page:0,referenceSlide:0,id:`annual-composition-${b.metric}`,annualCompositionMetric:b.metric,sectionId:'launches',title:b.title,intention:'Composição anual por padrão',visualFamily:'trend-chart' as const,contractKeys:['launch.annual.composition'],methodologyStatus:'reconciled' as const})));
  return output.map((p,i)=>({...p,page:i+1}));
}
