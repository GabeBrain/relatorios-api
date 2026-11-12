import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { confidenceOf, CONFIDENCE_META } from '../lib/v3/confidence';
import { presentFindingPt } from '../lib/v3/present-finding-pt';
import type { FindingV3, FindingStatus, StudyV3 } from '../lib/v3/db';
import StudySlideViewer from './StudySlideViewer';
import { VizSwitch } from './audit/FindingCard';
import { useGeobrainSession } from '@/features/shared/geobrain-session/context';

type Decision = 'pendente' | 'corrigido' | 'fp' | 'ignorado';
export default function StudyQuickReview({ study, queue, onStatus, onVerdict, onClose }: {
  study: StudyV3; queue: FindingV3[];
  onStatus: (id: string, status: FindingStatus) => Promise<boolean>;
  onVerdict: (id: string, verdict: 'bug' | 'fp') => Promise<boolean>;
  onClose: () => void;
}) {
  const session = useGeobrainSession();
  const [frozen] = useState(queue), [index, setIndex] = useState(0);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [saving, setSaving] = useState(false), [error, setError] = useState('');
  const lock = useRef(false);
  const item = frozen[index];
  const act = useCallback(async (decision: Decision) => {
    if (!item || lock.current) return;
    lock.current = true; setSaving(true); setError('');
    try {
      const saved = decision === 'pendente' ? true : decision === 'fp'
        ? await onVerdict(item.ruleId, 'fp') : await onStatus(item.ruleId, decision);
      if (!saved) { setError('A decisão não foi salva. Este apontamento continua aberto.'); return; }
      setDecisions(d => ({ ...d, [item.ruleId]: decision })); setIndex(n => n + 1);
    } catch { setError('Não foi possível salvar. Tente novamente neste apontamento.'); }
    finally { lock.current = false; setSaving(false); }
  }, [item, onStatus, onVerdict]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest('input,textarea,button,a,[role="combobox"],[contenteditable="true"]') || lock.current) return;
      const command: Record<string, Decision> = { c: 'corrigido', f: 'fp', i: 'ignorado', ArrowRight: 'pendente' };
      if (command[event.key]) { event.preventDefault(); void act(command[event.key]); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); setIndex(n => Math.max(0, n - 1)); }
    };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  }, [act]);
  const f = item ? presentFindingPt(item.finding) : null;
  const slides = f ? [...f.slideRef.matchAll(/s(\d+)/g)].map(m => Number(m[1])) : [];
  const [selectedSlide, setSelectedSlide] = useState<number | null>(null);
  useEffect(() => { setSelectedSlide(null); }, [index]);
  const processed = Object.keys(decisions).length;
  return <Dialog open modal={!session.action} onOpenChange={open => { if (!open && !saving) onClose(); }}>
    <DialogContent aria-describedby={undefined} className="cq-dialog" onEscapeKeyDown={e => { if (saving) e.preventDefault(); }}>
      <header className="cq-header"><DialogTitle>Triagem rápida</DialogTitle><span>{item ? `${index + 1} de ${frozen.length}` : 'Percurso concluído'}</span></header>
      <Progress className="cq-progress" aria-label={`${processed} de ${frozen.length} apontamentos percorridos`} value={100 * processed / Math.max(1, frozen.length)} />
      <main className="cq-content">
        {f && item ? <>
          <div className="cp-actions">{slides.map(n => <Button key={n} variant={(selectedSlide ?? slides[0]) === n ? 'default' : 'outline'} onClick={() => setSelectedSlide(n)}>Slide {n}</Button>)}</div>
          {slides.length > 0 && <StudySlideViewer study={study} slide={selectedSlide ?? slides[0]} evidence={f.evidenceImage} />}
          <article className="cf-card"><div className="cf-body"><div><p className="cp-muted">{CONFIDENCE_META[confidenceOf(f, item.origem)].label}</p><h2>{f.title}</h2>{f.detail !== f.title && <p className="cf-detail">{f.detail}</p>}{f.viz && <VizSwitch finding={f} />}</div></div></article>
          <p className="cp-muted">“Já ajustei” registra sua declaração. A correção precisa ser reconferida no arquivo. Ignorar conserva o apontamento no histórico.</p>
          {error && <p role="alert">{error}</p>}
          <div className="cp-actions"><Button disabled={saving} onClick={() => void act('pendente')}>Manter pendente e avançar</Button><Button variant="outline" disabled={saving} onClick={() => void act('corrigido')}>Já ajustei · C</Button><Button variant="outline" disabled={saving} onClick={() => void act('fp')}>Não é erro · F</Button><Button variant="outline" disabled={saving} onClick={() => void act('ignorado')}>Ignorar · I</Button><Button variant="outline" disabled={saving || index === 0} onClick={() => setIndex(n => n - 1)}>Anterior</Button>{saving && <span role="status">Salvando decisão…</span>}</div>
        </> : <section><h2>Apontamentos percorridos</h2><p>{processed} itens únicos. {Object.values(decisions).filter(d => d === 'pendente').length} mantidos pendentes. As decisões não comprovam correção do arquivo.</p><Button onClick={onClose}>Voltar à revisão</Button></section>}
      </main>
    </DialogContent>
  </Dialog>;
}
