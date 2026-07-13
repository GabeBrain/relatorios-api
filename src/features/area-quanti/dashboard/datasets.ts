export interface DatasetRef {
  id: string;
  label: string;
  /** Lovable Cloud Storage bucket */
  bucket: string;
  /** Object path within the bucket */
  path: string;
}

/**
 * Registry das bases da Área Quanti.
 * Para adicionar uma nova base (2019, 2021, 2022...):
 *   1. Suba o JSON convertido no bucket `quanti-datasets`.
 *   2. Adicione um item aqui com { id, label, bucket, path }.
 * Nenhuma alteração nos gráficos/filtros é necessária.
 */
export const DATASETS: DatasetRef[] = [
  { id: '2020', label: 'Base Unificada 2020', bucket: 'quanti-datasets', path: 'base-2020.json' },
];
