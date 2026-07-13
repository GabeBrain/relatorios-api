export interface DatasetRef {
  id: string;
  label: string;
  url: string;
}

export const DATASETS: DatasetRef[] = [
  { id: '2020', label: 'Base Unificada 2020', url: '/data/quanti/base-2020.json' },
];
