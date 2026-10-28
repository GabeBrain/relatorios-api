import type { ReactNode } from 'react';
import { METHODS, type StudyProtocol } from './study';
import { shiftMonth } from '../expanded/contract';
import { methodColor } from './format';

const steps = ['Condição de estudo', 'Amostra e período', 'Retrospectiva', 'Comparar resultados', 'Investigar casos', 'Dados e evidências'];
export function StudyJourney({ current, hasData, hasStudy, hasResult, onStep }: { current: number; hasData: boolean; hasStudy: boolean; hasResult: boolean; onStep: (n: number) => void }) {
  return <nav aria-label="Jornada do estudo"><ol className="ev-design-journey">{steps.map((label, i) => <li key={label} data-complete={i < current}><button type="button" aria-current={current === i ? 'step' : undefined} disabled={i === 0 ? false : i < 3 ? !hasStudy : i < 5 ? !hasResult : !hasData} onClick={() => onStep(i)}><span>{String(i + 1).padStart(2, '0')}</span>{label}</button></li>)}</ol></nav>;
}

export function PeriodStory({ protocol, first, latest }: { protocol: StudyProtocol; first: string; latest: string }) {
  const last = [...protocol.cutoffs].sort().at(-1)!;
  const through = shiftMonth(last, Math.max(...protocol.horizons));
  return <section className="ev-design-period" aria-label="Período explicado"><p className="ev-overline">O tempo do experimento</p><p className="ev-design-sentence">Usaremos os dados até <mark>{protocol.cutoffs.length === 1 ? last : `${protocol.cutoffs.length} datas passadas`}</mark> para prever o que aconteceu depois.</p><p className="ev-note">{protocol.cutoffs.join(' · ')} · comparar {protocol.horizons.join(', ')} meses depois · {protocol.target === 'stock' ? 'estoque final' : 'vendas líquidas do intervalo'}.</p><div className="ev-design-timeline" role="img" aria-label={`Histórico disponível desde ${first}; últimas previsões em ${last}; horizonte até ${through}; dados reportados até ${latest}`}><span>Histórico usado</span><span>Resultado a comparar</span></div><div className="ev-design-timeline-labels"><span>{first}</span><span>Última data de previsão: {last}</span><span>{through}</span></div><p className="ev-note">Dados reportados até {latest}. A faixa é um esquema da separação temporal; não representa densidade de coletas nem preenche lacunas.</p></section>;
}

export function MethodPreview({ protocol }: { protocol: StudyProtocol }) {
  const blockedReference = protocol.cutoffs.every(c => c < '2026-09');
  return <div className="ev-design-methods" aria-label="Métodos previstos">{METHODS.map(m => <article key={m.id} data-inactive={!protocol.methods.includes(m.id) || m.id === 'finotti-reference' && blockedReference}><span className="ev-design-method-swatch" style={{ borderColor: methodColor(m.id), borderStyle: m.id === 'finotti-reference' ? 'solid' : 'dashed' }}/><h3>{m.label}</h3><p className="ev-note">{m.explanation}</p><p className="ev-design-status">{!protocol.methods.includes(m.id) ? 'Fora desta execução' : m.id === 'finotti-reference' && blockedReference ? 'Treino posterior às datas · avaliação bloqueada' : 'Disponibilidade conferida caso a caso'}</p></article>)}</div>;
}

export function EvidenceLadder({ origin }: { origin: string }) {
  return <section aria-label="Nível de evidência"><p className="ev-overline">Como interpretar este resultado</p><ol className="ev-design-evidence"><li><span>Implementação de referência</span><strong>Reprodução do método</strong><p>Casos documentados do Finotti reproduzidos; não comprovam precisão em Curitiba.</p></li><li aria-current={origin === 'unknown' || origin === 'estimated' ? 'step' : undefined}><span>{origin === 'unknown' || origin === 'estimated' ? 'Este resultado' : 'Comparação exploratória'}</span><strong>Histórico reportado</strong><p>O resultado posterior pode conter estimativas ou revisões; a origem é identificada no estudo.</p></li><li aria-current={origin === 'observed' ? 'step' : undefined}><span>{origin === 'observed' ? 'Alvos documentados selecionados' : 'Requer confirmação'}</span><strong>Coleta real confirmada</strong><p>Exige comprovação por período. A flag atual do cadastro não substitui essa evidência.</p></li></ol></section>;
}

export function ChartExplanation({ title, children }: { title: string; children: ReactNode }) {
  return <aside className="ev-design-chart-aside"><details open><summary>{title}</summary><div>{children}</div></details></aside>;
}

export function EquivalentTable({ children }: { children: ReactNode }) {
  return <details className="ev-design-equivalent"><summary>Ver os valores em tabela</summary>{children}</details>;
}
