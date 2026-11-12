import { historyFingerprint } from './building-history';

export class BuildingSourceContractError extends Error {
  constructor(message: string) { super(`Contrato da fonte: ${message}`); this.name = 'BuildingSourceContractError'; }
}
const geographicKey = (v: unknown) => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

export function readBuildingPage(payload: Record<string, unknown>, scope: { city: string; uf: string }, page: number, source: string) {
  const meta = payload.meta as Record<string, unknown> | undefined;
  const lastPage = Number(meta?.last_page);
  if (!Array.isArray(payload.data) || !Number.isSafeInteger(lastPage) || lastPage < page || page < 1)
    throw new BuildingSourceContractError(`Contrato de paginação inválido em ${scope.city}, página ${page}.`);
  if (meta?.current_page !== undefined && Number(meta.current_page) !== page)
    throw new BuildingSourceContractError(`Página recebida diferente da solicitada em ${scope.city}.`);
  if (meta?.total !== undefined && (!Number.isSafeInteger(Number(meta.total)) || Number(meta.total) < 0))
    throw new BuildingSourceContractError('Total paginado inválido.');
  const buildings: Record<string, unknown>[] = payload.data.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new BuildingSourceContractError('Empreendimento inválido na resposta.');
    const building = item as Record<string, unknown>;
    if (!String(building.building_id ?? building.id ?? '').trim()) throw new BuildingSourceContractError('Empreendimento sem ID na resposta.');
    if (building.city && geographicKey(building.city) !== geographicKey(scope.city)
      || (building.state ?? building.uf) && geographicKey(building.state ?? building.uf) !== geographicKey(scope.uf))
      throw new BuildingSourceContractError(`Resposta fora do recorte autorizado ${scope.city}/${scope.uf}.`);
    return { ...building, __panoramaSource: { contract: 'building-history-v2', source, page, city: scope.city, uf: scope.uf } };
  });
  return { buildings, lastPage, total: meta?.total === undefined ? null : Number(meta.total) };
}

export function insertBuilding(target: Map<string, Record<string, unknown>>, building: Record<string, unknown>) {
  const id = String(building.building_id ?? building.id ?? '');
  if (!id) throw new BuildingSourceContractError('Empreendimento sem ID na resposta.');
  const previous = target.get(id);
  const content = (b: Record<string, unknown>) => Object.fromEntries(Object.entries(b).filter(([key]) => !key.startsWith('__panorama')));
  if (previous && historyFingerprint(content(previous)) !== historyFingerprint(content(building)))
    throw new BuildingSourceContractError(`Empreendimento ${id} repetido com conteúdos conflitantes.`);
  if (!previous) target.set(id, building);
  else {
    const source = previous.__panoramaSource as Record<string, unknown>;
    const received = building.__panoramaSource as Record<string, unknown>;
    source.repeatedPages = [...(Array.isArray(source.repeatedPages) ? source.repeatedPages : []), { source: received.source, page: received.page }];
  }
}
