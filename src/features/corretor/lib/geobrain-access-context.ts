import { createContext, useContext } from 'react';
export const GeobrainAccessContext = createContext<(action: string) => Promise<boolean>>(async () => false);
export const useGeobrainAccess = () => useContext(GeobrainAccessContext);
