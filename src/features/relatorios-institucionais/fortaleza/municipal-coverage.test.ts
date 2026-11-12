import { describe,it,expect } from 'vitest';
import { monthlyMarketFixture,monthlyMarketSelection } from './__tests__/monthly-market-fixture';
import { monthlySourceCoverage } from './municipal-coverage';
import { monthlyMarketSourceIssue } from './monthly-market';
describe('Fortaleza — evidência da matriz municipal rejeitada',()=>{
  it('preserva grupos, meses, valores agregados e células ausentes sem convertê-las em zero',()=>{
    const data=monthlyMarketFixture(),source=data.sources[0],missing=source.rows.pop()!;
    const coverage=monthlySourceCoverage(source,data.months);
    expect(coverage.rowsReceived).toBe(174);expect(coverage.cells).toHaveLength(174);
    expect(coverage.missingCells).toContainEqual({month:String(missing.period).slice(0,7),group:'luxo'});
    expect(monthlyMarketSourceIssue(source,data.months)).toBeNull();
    expect(coverage.missingStandards).toEqual([]);
  });
  it('distingue grupo inexistente no município de fonte vazia e categoria comercial desconhecida',()=>{
    const data=monthlyMarketFixture(),source=data.sources[0];source.rows=source.rows.filter(row=>row.group!=='Luxo');
    expect(monthlySourceCoverage(source,data.months).missingStandards).toEqual(['Luxo']);
    source.rows=[];expect(monthlySourceCoverage(source,data.months).missingMonths).toHaveLength(25);
    source.segment='Comercial';source.rows=[{period:'2026-07-01',group:'Comercial inesperado',building_type:'Comercial',releases_in_period:1,Authorization:'private-token'}];
    const coverage=monthlySourceCoverage(source,data.months);expect(coverage.groups[0].unknownCategory).toBe(true);
    expect(JSON.stringify(coverage)).not.toContain('private-token');expect(JSON.stringify(coverage)).not.toContain('Authorization');
    expect(monthlyMarketSelection.position).toBe(7);
  });
});
