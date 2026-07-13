export interface QuantiRecord {
  research_name: string;
  data_pesquisa: string;
  regiao: string;
  localidade: string;
  estado: string;
  cidade: string;
  cidade_original?: string;
  genero: string;
  faixa_etaria: string;
  geracao: string;
  idade: number | null;
  renda_macro_faixa: string;
  renda_faixa_padronizada: string;
  renda_classe_agregada: string;
  renda_classe_detalhada: string;
  renda_valor_estimado: number | null;
  intencao_compra_padronizada: string;
  tempo_intencao_padronizado: string;
  lat: number | null;
  lng: number | null;
}

export interface QuantiDataset {
  id: string;
  label: string;
  count: number;
  generated_at: string;
  /** Optional variable → question text map (row 2 of the source spreadsheet). */
  questions?: Record<string, string>;
  records: QuantiRecord[];
}

export type CategoricalField =
  | 'research_name'
  | 'regiao'
  | 'localidade'
  | 'estado'
  | 'cidade'
  | 'cidade_original'
  | 'genero'
  | 'faixa_etaria'
  | 'geracao'
  | 'renda_macro_faixa'
  | 'renda_faixa_padronizada'
  | 'renda_classe_agregada'
  | 'renda_classe_detalhada'
  | 'intencao_compra_padronizada'
  | 'tempo_intencao_padronizado'
  | 'data_pesquisa';

export type Filters = Partial<Record<CategoricalField, string[]>>;

export const FIELD_LABELS: Record<CategoricalField, string> = {
  research_name: 'Pesquisa',
  regiao: 'Região',
  localidade: 'Localidade',
  estado: 'Estado',
  cidade: 'Cidade (coleta)',
  cidade_original: 'Cidade do empreendimento',
  genero: 'Gênero',
  faixa_etaria: 'Faixa etária',
  geracao: 'Geração',
  renda_macro_faixa: 'Macro faixa de renda',
  renda_faixa_padronizada: 'Faixa padronizada',
  renda_classe_agregada: 'Classe social agregada',
  renda_classe_detalhada: 'Classe social detalhada',
  intencao_compra_padronizada: 'Intenção de compra',
  tempo_intencao_padronizado: 'Tempo para compra',
  data_pesquisa: 'Data da pesquisa',
};
