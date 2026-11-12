import { SP_API_PATTERNS } from './segments';

/** Use the observation's classification; legacy payloads may only provide the register's standard. */
export function spHistoricalPattern(row:Record<string,unknown>,building:Record<string,unknown>):string|null {
  const raw=row.pattern;
  const absent=raw===undefined||raw===null||typeof raw==='string'&&!raw.trim();
  const value=absent?building.standard:raw;
  return typeof value==='string'&&(SP_API_PATTERNS as readonly string[]).includes(value.trim())?value.trim():null;
}

/** Construction stage and active/sold-out status are different fields. Never infer stage from age. */
export function spHistoricalStage(row:Record<string,unknown>):unknown {
  const raw=row.estagio_empreendimento;
  return raw===undefined||raw===null||typeof raw==='string'&&!raw.trim()?row.building_status:raw;
}
