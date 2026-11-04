import type { ReportPageDefinition } from '../manifest';
export interface PresentationSeries { name: string; values: (number | null)[]; color?: string; type?: 'bar' | 'line'; }
export interface PresentationChart {
  labels: string[]; series: PresentationSeries[]; type: 'bar' | 'line'; horizontal?: boolean;
  unit?: string; percentage?: boolean; annotation?: string;
}
export interface PresentationCell { text: string; colspan?: number; rowspan?: number; header?: boolean; total?: boolean; fill?: string; }
export type PresentationBlock =
  | { kind: 'text'; text: string; role: 'title' | 'subtitle' | 'context' | 'body' | 'footer' }
  | { kind: 'table'; rows: PresentationCell[][] }
  | { kind: 'chart'; chart: PresentationChart }
  | { kind: 'map'; columns: number; rows: number; tiles: string[]; markers: { x: number; y: number; color: string; label: string; size: number }[] }
  | { kind: 'image'; src: string; alt: string };
export interface PresentationPage { id: string; definition: ReportPageDefinition; blocks: PresentationBlock[]; background?: string; rasterized: string[];
  cover?: { kind: 'study' | 'territory'; cities: string[]; uf: string; closing: string; window: string; official: boolean; entity: string };
}
export interface PanoramaPresentationPackage { schemaVersion: 'panorama-presentation-v1'; generation?: { generatedAt: string; templateVersion: 'panorama-native-16x9-v1' }; pages: PresentationPage[]; }
