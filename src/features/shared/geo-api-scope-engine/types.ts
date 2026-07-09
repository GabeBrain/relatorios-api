export interface GeoScope {
  uf: string;
  city: string;
}

export interface MonitoredCity {
  city?: string;
  state?: string;
}

export type GeoApiScopeErrorCode =
  | 'no_token'
  | 'unauthorized'
  | 'network'
  | 'bad_response';

export class GeoApiScopeError extends Error {
  code: GeoApiScopeErrorCode;
  status?: number;
  constructor(code: GeoApiScopeErrorCode, message: string, status?: number) {
    super(message);
    this.name = 'GeoApiScopeError';
    this.code = code;
    this.status = status;
  }
}
