import { useEffect, useState, type ReactNode } from 'react';
import brainLogo from '../../../../assets/logoBrain.png';
import './corretor-loading.css';

/** A animação indica atividade; só os contadores externos representam progresso real. */
export default function CorretorLoadingState({ title, description, compact = false, children }: {
  title: string; description?: string; compact?: boolean; children?: ReactNode;
}) {
  const [startedAt] = useState(Date.now);
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, [startedAt]);
  return <div className="cp-brain-loading" data-compact={compact} role="status" aria-live="polite" aria-busy="true">
    <div className="cp-brain-loading-logo" aria-hidden="true">
      <img src={brainLogo} alt="" className="cp-brain-loading-ghost" />
      <img src={brainLogo} alt="" className="cp-brain-loading-fill" />
    </div>
    <div className="cp-brain-loading-copy">
      <p className="cp-brain-loading-title">{title}</p>
      {description && <p className="cp-brain-loading-description">{description}</p>}
      {children}
    </div>
    <span className="cp-brain-loading-time" aria-hidden="true">{Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}</span>
  </div>;
}
