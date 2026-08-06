export interface HistoryEntry {
  period: string; // 'YYYY-MM-DD' or similar
  periodDate: Date;
  price: number | null;
  price_private_area: number | null;
  typology_stock: number;
  sold_in_period: number;
  vgv_stock: number | null;
  // ---- v2 ----
  pattern: string; // padrão do empreendimento no período (substitui building.standard)
  building_status: string;
  time_on_sale: number | null;
  private_area: number | null;
  public_area: number | null;
  price_public_area: number | null;
  release_price: number | null;
  vgv_total: number | null;
  sold: number;
  number_bedroom: number;
  number_suite: number;
  garage: number;
  qty: number;
  estagio_empreendimento: string;
  taxa_associativa: number | null;
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

export interface Incorporator {
  id: string;
  name: string;
}

export interface BuildingArea {
  area: string;
  type: string;
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
  // ---- v2 ----
  delivery_date: string;
  zipcode: string;
  address: string;
  address_number: string;
  city_id: string;
  latitude: number | null;
  longitude: number | null;
  towers: number | null;
  floors: number | null;
  elevators: number | null;
  period: string;
  time_on_sale: number | null;
  total_stock: number | null;
  total_units: number | null;
  builder_name: string;
  bathrooms: number | null;
  has_suites: string;
  last_update: string;
  interest_rate_index: string;
  interest_rate_tax: number | null;
  bank_financing: string;
  own_financing: string;
  fiduciary_ownership: string;
  down_payment_percentage: number | null;
  discount_percentage: number | null;
  number_of_installments: number | null;
  incorporators: Incorporator[];
  areas: BuildingArea[];
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
  privateAreas: string[]; // faixas dinâmicas 'lo|hi'
  pricePerM2: string[]; // faixas dinâmicas 'lo|hi'
}

export type Granularity = 'month' | 'quarter' | 'year';
