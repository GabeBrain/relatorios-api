/** Injeta cidade/período das capas oficiais como custom properties lidas pelo CSS de impressão. */
export function synchronizeOfficialCoverCity(city: string, uf: string, endQuarter: string) {
  const normalizedCity = city.toLocaleUpperCase('pt-BR');
  const reportYear = endQuarter.slice(2);
  const cityScale = Math.min(1, 12 / Math.max(normalizedCity.length, 1));
  const style = document.documentElement.style;
  style.setProperty('--panorama-city', JSON.stringify(normalizedCity));
  style.setProperty('--panorama-city-uf', JSON.stringify(`${normalizedCity} (${uf})`));
  style.setProperty('--panorama-year', JSON.stringify(reportYear));
  style.setProperty('--panorama-period', JSON.stringify(`${endQuarter[0]}ºTRI/${reportYear}`));
  style.setProperty('--panorama-city-scale', String(cityScale));
}
