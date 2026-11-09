import { createRoot } from 'react-dom/client';
import FortalezaIntroSlide from '../../src/features/relatorios-institucionais/fortaleza/FortalezaIntroSlide';
import type { IntroView } from '../../src/features/relatorios-institucionais/fortaleza/intro-view';
const query = new URLSearchParams(location.search);
const model = query.get('model') === 'julho' ? 'julho' : 'junho';
const page = Number(query.get('page') ?? 1);
fetch('/.local-inputs/relatorios-lucas/fortaleza/intro-control-views.json').then(response => response.json()).then((views: Record<string, IntroView>) => {
  createRoot(document.getElementById('root')!).render(<div style={{ width: 1280, height: 720 }}><FortalezaIntroSlide model={model} page={page} view={views[model]} /></div>);
});
