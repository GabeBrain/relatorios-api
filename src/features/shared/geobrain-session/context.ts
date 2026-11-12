import { createContext, useContext } from 'react';
export type SessionState = 'restoring' | 'anonymous' | 'ready' | 'api_only' | 'expired' | 'error';
export const GeobrainSessionContext = createContext({
  state: 'restoring' as SessionState, action: '', request: 0,
  login: async (_email: string, _password: string, _fallback?: string | null) => {},
  logout: async () => {}, cancel: () => {},
});
export const useGeobrainSession = () => useContext(GeobrainSessionContext);
