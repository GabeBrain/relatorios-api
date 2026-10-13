import type { CSSProperties } from 'react';
import type { PanoramaScope } from '../types';
import { quarterLabel } from '../lib/launches';
import { customCoverLayout, customTerritoryLayout, customTerritoryPages } from '../report/custom-cover-layout';
import '@/styles/geobrain-tokens.css';
import '../print/custom-fiergs-covers.css';

function StudyPeriod({ scope }: { scope: PanoramaScope }) {
  return <span>{scope.startQuarter && scope.startQuarter !== scope.endQuarter ? `${quarterLabel(scope.startQuarter)} — ${quarterLabel(scope.endQuarter)}` : quarterLabel(scope.endQuarter)}</span>;
}

export function CustomFiergsStudyCover({ scope }: { scope: PanoramaScope }) {
  const layout = customCoverLayout(scope);
  return <div className="panorama-custom-cover" data-cover-size={layout.titleSize}>
    <header><span>Brain · Inteligência Estratégica</span><strong>FIERGS <i aria-hidden="true">/</i> {layout.uf}</strong></header>
    <main>
      <p className="panorama-custom-eyebrow">Panorama imobiliário</p>
      <h1>{layout.headline}</h1>
      <i className="panorama-custom-cover-accent" aria-hidden="true"/>
      {layout.showCoverNames ? <ul className="panorama-custom-cover-cities" data-count={layout.cities.length}>{layout.cities.map((city) => <li key={city}>{city}</li>)}</ul>
        : layout.cities.length > 1 ? <p className="panorama-custom-cover-count">{layout.cityCountLabel} <span>·</span> {layout.uf}</p> : <p className="panorama-custom-cover-count">{layout.uf}</p>}
      <div className="panorama-custom-cover-closing"><span>Fechamento</span><strong>{quarterLabel(scope.endQuarter)}</strong></div>
    </main>
    <footer><span>Modelo FIERGS · Recorte municipal</span><span>Janela do estudo <StudyPeriod scope={scope}/></span></footer>
  </div>;
}

export function CustomFiergsTerritoryCover({ scope, cities }: { scope: PanoramaScope; cities?: string[] }) {
  const identity = customCoverLayout(scope);
  const names = cities ?? identity.cities;
  const layout = customTerritoryLayout(names);
  const pages = customTerritoryPages(identity);
  const pageIndex = Math.max(0, pages.findIndex((page) => page[0] === names[0]));
  return <div className="panorama-custom-territory" data-density={layout.dense ? 'dense' : 'regular'} data-long-names={layout.longNames}>
    <header><p className="panorama-custom-eyebrow">FIERGS · {identity.uf}</p><h2>Recorte territorial</h2><p>{identity.cityCountLabel} {identity.cities.length === 1 ? 'analisado' : 'analisados'}</p></header>
    <main><ul style={{ '--territory-columns': layout.columns } as CSSProperties}>{names.map((city) => <li key={city}>
      <span className="panorama-custom-city-index">{String(identity.cities.indexOf(city) + 1).padStart(2, '0')}</span><strong>{city}</strong>
    </li>)}</ul></main>
    <footer><span>Janela do estudo <StudyPeriod scope={scope}/></span><span>{pages.length > 1 ? `Municípios · ${pageIndex + 1} de ${pages.length}` : `Fechamento · ${quarterLabel(scope.endQuarter)}`}</span></footer>
  </div>;
}
