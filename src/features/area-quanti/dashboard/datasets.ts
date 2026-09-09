export interface DatasetRef {
  id: string;
  label: string;
  /** Dataset source. Defaults to Lovable Cloud Storage for legacy entries. */
  source?: 'public' | 'storage' | 'combined';
  /** Lovable Cloud Storage bucket, when source is storage. */
  bucket?: string;
  /** Object path within the bucket or public URL path. Vazio para bases combinadas. */
  path: string;
  /** IDs das bases que compõem uma base combinada (reaproveitam o cache já carregado). */
  parts?: string[];
}

/**
 * Registry das bases da Área Quanti.
 * Para adicionar uma nova base (2019, 2021, 2022...):
 *   1. Converta a planilha em JSON e publique em `public/quanti/`.
 *   2. Adicione um item aqui com { id, label, source, path }.
 * Nenhuma alteração nos gráficos/filtros é necessária.
 */
export const DATASETS: DatasetRef[] = [
  { id: '2019', label: 'Base Unificada 2019', source: 'storage', bucket: 'quanti-datasets', path: 'base-2019.json' },
  { id: '2020', label: 'Base Unificada 2020', source: 'storage', bucket: 'quanti-datasets', path: 'base-2020.json' },
  { id: '2021', label: 'Base Unificada 2021', source: 'storage', bucket: 'quanti-datasets', path: 'base-2021.json' },
  { id: '2022', label: 'Base Unificada 2022', source: 'storage', bucket: 'quanti-datasets', path: 'base-2022.json' },
  { id: '2023', label: 'Base Unificada 2023', source: 'storage', bucket: 'quanti-datasets', path: 'base-2023.json' },
  { id: '2024', label: 'Base Unificada 2024', source: 'storage', bucket: 'quanti-datasets', path: 'base-2024.json' },
  { id: '2025', label: 'Base Unificada 2025', source: 'storage', bucket: 'quanti-datasets', path: 'base-2025.json' },
  {
    id: '2019-2025',
    label: 'Base Unificada 2019 – 2025',
    source: 'combined',
    path: '',
    parts: ['2019', '2020', '2021', '2022', '2023', '2024', '2025'],
  },
];

/** Base padrão: último ano anual disponível. */
export const DEFAULT_DATASET_ID = '2025';
