export interface DatasetRef {
  id: string;
  label: string;
  /** Dataset source. Defaults to Lovable Cloud Storage for legacy entries. */
  source?: 'public' | 'storage';
  /** Lovable Cloud Storage bucket, when source is storage. */
  bucket?: string;
  /** Object path within the bucket or public URL path. */
  path: string;
}

/**
 * Registry das bases da Área Quanti.
 * Para adicionar uma nova base (2019, 2021, 2022...):
 *   1. Converta a planilha em JSON e publique em `public/quanti/`.
 *   2. Adicione um item aqui com { id, label, source, path }.
 * Nenhuma alteração nos gráficos/filtros é necessária.
 */
export const DATASETS: DatasetRef[] = [
  { id: '2020', label: 'Base Unificada 2020', source: 'storage', bucket: 'quanti-datasets', path: 'base-2020.json' },
];
