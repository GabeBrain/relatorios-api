export interface HistoryEntry {
  period: string; // 'YYYY-MM-DD' or similar
  periodDate: Date;
  price: number | null;
  price_private_area: number | null;
  typology_stock: number;
  sold_in_period: number;
  vgv_stock: number | null;
}

export interface Typology {
  typology_id: string;
  type_of_typology: string; // Padrão, Cobertura, Garden...
  number_bedroom: number;
  garage: number;
  qty: number; // oferta inicial
  private_area: number | null;
  release_price: number | null;
  history: HistoryEntry[];
}

export interface Building {
  building_id: string;
  name: string;
  status: string;
  city: string;
  state: string;
  neighborhood: string;
  building_type: string; // Vertical/Horizontal/Comercial/Hotel
  standard: string;
  release_date: string;
  releaseYear: number | null;
  typologies: Typology[];
}

export interface Filters {
  from: Date | null;
  to: Date | null;
  years: string[];
  periods: string[]; // 'YYYY-MM'
  status: string[];
  cities: string[];
  neighborhoods: string[];
  types: string[];
  typologies: string[];
  standards: string[];
  bedrooms: string[];
  garages: string[]; // '0','1','2','3','4+'
  buildings: string[]; // building_id
}

export type Granularity = 'month' | 'quarter' | 'year';
