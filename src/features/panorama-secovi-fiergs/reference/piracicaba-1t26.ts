import { buildLaunchModel } from '../lib/launches';
import type { LaunchRecord, PanoramaReference } from '../types';

const quarters = ['1T2022', '2T2022', '3T2022', '4T2022', '1T2023', '2T2023', '3T2023', '4T2023', '1T2024', '2T2024', '3T2024', '4T2024', '1T2025', '2T2025', '3T2025', '4T2025', '1T2026'] as const;
const projectsVertical = [1, 4, 2, 2, 4, 3, 2, 4, 2, 2, 6, 2, 2, 3, 1, 2, 2];
const projectsHorizontal = [0, 2, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0];
const projectsEconomic = [1, 2, 1, 0, 2, 2, 0, 1, 1, 1, 5, 2, 2, 1, 0, 2, 0];
const unitsVertical = [464, 260, 688, 154, 543, 496, 274, 644, 269, 351, 1463, 368, 616, 458, 76, 504, 280];
const unitsHorizontal = [0, 773, 148, 0, 0, 0, 239, 0, 367, 0, 239, 0, 0, 0, 200, 0, 0];
const unitsEconomic = [464, 152, 608, 0, 444, 424, 0, 194, 235, 231, 1378, 368, 616, 310, 0, 504, 0];
const vgvVertical = [101.009, 307.806, 221.744, 110.909, 201.56, 152.957, 197.457, 297.133, 103.609, 176.491, 359.609, 94.094, 165.062, 253.552, 60.778, 135.165, 227.687];
const vgvHorizontal = [0, 230.649, 28.217, 0, 0, 0, 67.755, 0, 117.385, 0, 85.497, 0, 0, 0, 62.377, 0, 0];
const vgvEconomic = [101.009, 38.984, 131.478, 0, 116.257, 101.511, 0, 44.611, 58.099, 73.566, 326.656, 94.094, 165.062, 80.123, 0, 135.165, 0];

export const PIRACICABA_1T26_RECORDS: LaunchRecord[] = quarters.flatMap((quarter, index) => [
  { quarter, segment: 'Vertical' as const, projects: projectsVertical[index], units: unitsVertical[index], vgvMillions: vgvVertical[index], economicProjects: projectsEconomic[index], otherProjects: projectsVertical[index] - projectsEconomic[index], economicUnits: unitsEconomic[index], otherUnits: unitsVertical[index] - unitsEconomic[index], economicVgvMillions: vgvEconomic[index], otherVgvMillions: vgvVertical[index] - vgvEconomic[index] },
  { quarter, segment: 'Horizontal' as const, projects: projectsHorizontal[index], units: unitsHorizontal[index], vgvMillions: vgvHorizontal[index] },
]);

export const PIRACICABA_1T26_REFERENCE: PanoramaReference = {
  id: 'piracicaba-sp-1t2026',
  label: 'Piracicaba/SP · 1T2026',
  scope: { uf: 'SP', cities: ['Piracicaba'], endQuarter: '1T2026' },
  model: buildLaunchModel(PIRACICABA_1T26_RECORDS),
};

export function referenceForScope(uf: string, city: string, endQuarter: string): PanoramaReference | null {
  return uf === 'SP' && city.localeCompare('Piracicaba', 'pt-BR', { sensitivity: 'base' }) === 0 && endQuarter === '1T2026'
    ? PIRACICABA_1T26_REFERENCE
    : null;
}
